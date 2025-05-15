import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ImageMetadata } from 'astro'
export const isClient = typeof window !== 'undefined'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function readingTimeMinutes(html: string): number {
  const textOnly = html.replace(/<[^>]+>/g, '')
  const wordCount = textOnly.split(/\s+/).length
  const readingTimeMinutes = wordCount / 200 + 1
  return readingTimeMinutes
}

export function readingTime(html: string) {
  const minutes = readingTimeMinutes(html).toFixed()
  return `${minutes} min read`
}

export function isLongArticle(html: string): boolean {
  const minutes = readingTimeMinutes(html)
  return minutes > 4
}

export async function getAlbumImages(
  albumId: string,
): Promise<ImageMetadata[]> {
  // 1. List all album files from collections path
  let images = import.meta.glob<{ default: ImageMetadata }>(
    '/src/assets/images/**/*.{jpeg,jpg,JPG,PNG,png,webp}',
  )

  // 2. Filter images by albumId, exclude source files, and only include preview images
  images = Object.fromEntries(
    Object.entries(images).filter(
      ([key]) =>
        key.includes(albumId) &&
        !key.includes('source') &&
        key.includes('-preview'),
    ),
  )

  // 3. Images are promises, so we need to resolve the glob promises
  const resolvedImages = await Promise.all(
    Object.values(images).map((image) => image().then((mod) => mod.default)),
  )

  // 4. Shuffle images in random order
  resolvedImages.sort(() => Math.random() - 0.5)
  return resolvedImages
}

export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), delay)
  }
}
