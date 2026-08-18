import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getEntry } from 'astro:content'
import { getPublicMediaUrl, getR2Config } from '@/lib/server-config'

import type { ImageMetadata } from 'astro'

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
  const r2 = getR2Client()
  if (!r2) return 0

  try {
    const resp = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.bucket,
        Prefix: `${albumId}/`,
      }),
    )

    return (
      resp.Contents?.filter((obj) => obj.Key?.endsWith('.webp')).length || 0
    )
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
  const r2 = getR2Client()
  if (!r2) return []

  try {
    const resp = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.bucket,
        Prefix: `${albumId}/`,
      }),
    )

    const objects = resp.Contents || []

    // 2. Only keep preview images
    const previews = objects.filter(
      (obj) => obj.Key && obj.Key.includes('-preview'),
    )

    const images: ImageMetadata[] = previews.flatMap((obj) => {
      const src = getPublicMediaUrl(obj.Key!)
      return src ? [{ src } as ImageMetadata] : []
    })

    // 4. Shuffle order
    images.sort(() => Math.random() - 0.5)

    return images
  } catch (err) {
    console.error(`Error fetching album images for ${albumId}:`, err)
    return []
  }
}
