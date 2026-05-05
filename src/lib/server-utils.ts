import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { getEntry } from 'astro:content'
import dotenv from 'dotenv'

dotenv.config()

import type { ImageMetadata } from 'astro'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

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
  try {
    const resp = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.BUCKET!,
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

// Blur placeholder generator
export async function generateBlurPlaceholder(
  buffer: Buffer,
  blurSize = 32,
  blurSigma = 2.5,
): Promise<string | undefined> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(blurSize, blurSize, { fit: 'inside' })
      .blur(blurSigma)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true })

    const webpBuffer = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .webp({ quality: 60 })
      .toBuffer()

    return `data:image/webp;base64,${webpBuffer.toString('base64')}`
  } catch (err) {
    console.warn('Failed to generate blurred placeholder:', err)
    return undefined
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
      src: `https://${process.env.R2_PUBLIC_DOMAIN}/${id}/${cleanedFileName}`,
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
    const resp = await r2.send(
      new ListObjectsV2Command({
        Bucket: process.env.BUCKET!,
        Prefix: `${albumId}/`,
      }),
    )

    const objects = resp.Contents || []

    // 2. Only keep preview images
    const previews = objects.filter(
      (obj) => obj.Key && obj.Key.includes('-preview'),
    )

    const images: ImageMetadata[] = previews.map((obj) => {
      const key = obj.Key!
      return {
        src: `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`,
      } as ImageMetadata
    })

    // 4. Shuffle order
    images.sort(() => Math.random() - 0.5)

    return images
  } catch (err) {
    console.error(`Error fetching album images for ${albumId}:`, err)
    return []
  }
}
