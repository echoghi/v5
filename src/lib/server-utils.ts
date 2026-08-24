import {
  S3Client,
  ListObjectsV2Command,
  type _Object,
} from '@aws-sdk/client-s3'
import { getEntry } from 'astro:content'
import photoManifest from '@/data/photo-manifest.json'
import { getPublicMediaUrl, getR2Config } from '@/lib/server-config'

import type { ImageMetadata } from 'astro'
import type { CollectionEntry } from 'astro:content'

let r2Client: S3Client | null = null

function getR2Client() {
  const config = getR2Config()
  if (!config) return null

  r2Client ??= new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: config.credentials,
  })

  return { client: r2Client, bucket: config.bucket }
}

type FullSizeImage = Omit<ImageMetadata, 'src' | 'width' | 'height'> & {
  src: string
  hash: string
  width?: number
  height?: number
  blurDataUrl: string
}

type PhotoManifestEntry = {
  width: number
  height: number
  hidden?: boolean
  publicNote?: string
  camera?: string
  lens?: string
  location?: string
  capturedAt?: string
  captureOffset?: string
  latitude?: number
  longitude?: number
  aperture?: number
  focalLength?: number
  iso?: number
}

export type PhotostreamImage = {
  id: string
  slug: string
  manifestKey: string
  previewSrc: string
  fullSrc: string
  collectionId: string
  collectionName: string
  period?: string
  publicNote?: string
  capturedAt?: string
  camera?: string
  lens?: string
  location: string
  hasExplicitLocation: boolean
  latitude?: number
  longitude?: number
  shape: 'landscape' | 'portrait'
  width: number
  height: number
  rowSpan: number
}

async function listAlbumObjects(albumId: string): Promise<_Object[]> {
  const r2 = getR2Client()
  if (!r2) return []

  const objects: _Object[] = []
  let continuationToken: string | undefined

  do {
    const response = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.bucket,
        Prefix: `${albumId}/`,
        ContinuationToken: continuationToken,
      }),
    )

    objects.push(...(response.Contents ?? []))
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return objects
}

function getFullSizeKey(previewKey: string) {
  return previewKey.replace('-preview', '').replace(/\.(jpe?g|png)$/i, '.webp')
}

function getPhotoSlug(id: string, capturedAt?: string) {
  const captureDate = capturedAt?.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return `${captureDate ?? 'undated'}-${id}`
}

export async function parseAuthors(authors: string[]) {
  if (!authors || authors.length === 0) return []

  const parseAuthor = async (id: string) => {
    try {
      const author = await getEntry('authors', id)
      return {
        id,
        name: author?.data?.name || id,
        avatar: author?.data?.avatar || '/static/logo.png',
        isRegistered: !!author,
      }
    } catch (error) {
      console.error(`Error fetching author with id ${id}:`, error)
      return {
        id,
        name: id,
        avatar: '/static/logo.png',
        isRegistered: false,
      }
    }
  }

  return await Promise.all(authors.map(parseAuthor))
}

// Count photos in an album
export async function getPhotoCount(albumId: string): Promise<number> {
  try {
    const objects = await listAlbumObjects(albumId)
    return objects.filter((object) => object.Key?.endsWith('.webp')).length
  } catch (error) {
    console.error('Error counting photos:', error)
    return 0
  }
}

export async function getFullSizeImages(
  images: ImageMetadata[],
  id: string,
): Promise<FullSizeImage[]> {
  return images.map((img) => {
    const fileName = img.src.split('/').pop()
    if (!fileName) return img as FullSizeImage

    const cleanedFileName = fileName
      .replace('-preview', '')
      .split('?')[0]
      .replace(/\.(jpe?g|png)$/i, '.webp')

    const hash = cleanedFileName.split('.')[0]

    return {
      ...img,
      src: getPublicMediaUrl(id, cleanedFileName) ?? img.src,
      width: img.width,
      height: img.height,
      hash,
      blurDataUrl: '',
    }
  })
}

export async function getAlbumImages(
  albumId: string,
): Promise<ImageMetadata[]> {
  try {
    const objects = await listAlbumObjects(albumId)
    const previews = objects.filter(
      (obj) => obj.Key && obj.Key.includes('-preview'),
    )

    const images: ImageMetadata[] = previews.flatMap((obj) => {
      const src = getPublicMediaUrl(obj.Key!)
      return src ? [{ src } as ImageMetadata] : []
    })

    return images
  } catch (err) {
    console.error(`Error fetching album images for ${albumId}:`, err)
    return []
  }
}

export async function getPhotostreamImages(
  collections: CollectionEntry<'photos'>[],
): Promise<PhotostreamImage[]> {
  const groups = await Promise.all(
    collections.map(async (collection) => {
      try {
        const objects = await listAlbumObjects(collection.id)
        const previewKeys = objects
          .flatMap((object) =>
            object.Key?.includes('-preview') ? [object.Key] : [],
          )
          .sort((a, b) => a.localeCompare(b))

        return previewKeys.flatMap((previewKey) => {
          const previewSrc = getPublicMediaUrl(previewKey)
          const fullSrc = getPublicMediaUrl(getFullSizeKey(previewKey))
          if (!previewSrc || !fullSrc) return []

          const fileName = previewKey.split('/').pop() ?? previewKey
          const id = fileName.replace('-preview', '').replace(/\.[^.]+$/, '')
          const manifestKey =
            `${collection.id}/${id}` as keyof typeof photoManifest
          const metadata = photoManifest[manifestKey] as
            | PhotoManifestEntry
            | undefined
          if (metadata?.hidden) return []
          const width = metadata?.width ?? 1200
          const height = metadata?.height ?? 900
          const aspectRatio = width / height

          return [
            {
              id: `${collection.id}-${id}`,
              slug: getPhotoSlug(id, metadata?.capturedAt),
              manifestKey,
              previewSrc,
              fullSrc,
              collectionId: collection.id,
              collectionName: collection.data.name,
              period: collection.data.period,
              publicNote: metadata?.publicNote,
              capturedAt: metadata?.capturedAt,
              camera: metadata?.camera,
              lens: metadata?.lens,
              location: metadata?.location || collection.data.name,
              hasExplicitLocation: Boolean(metadata?.location),
              latitude: metadata?.latitude,
              longitude: metadata?.longitude,
              shape:
                aspectRatio < 0.9
                  ? ('portrait' as const)
                  : ('landscape' as const),
              width,
              height,
              rowSpan: Math.max(4, Math.round((height / width) * 12)),
            } satisfies PhotostreamImage,
          ]
        })
      } catch (error) {
        console.error(
          `Error fetching photostream images for ${collection.id}:`,
          error,
        )
        return []
      }
    }),
  )

  // Interleave albums so the stream feels like one body of work rather than
  // a stack of hidden place-based sections. Collection order still provides a
  // subtle newest-first bias.
  const stream: PhotostreamImage[] = []
  const longestGroup = Math.max(0, ...groups.map((group) => group.length))

  for (let index = 0; index < longestGroup; index += 1) {
    for (const group of groups) {
      const image = group[index]
      if (image) stream.push(image)
    }
  }

  return stream
}
