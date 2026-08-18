import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
  return `${minutes} min`
}

export function isLongArticle(html: string): boolean {
  const minutes = readingTimeMinutes(html)
  return minutes > 4
}

export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), delay)
  }
}

export function getAlbumCoverFilename(song: {
  title: string
  artist: string
}): string {
  const normalizeText = (text: string) => {
    return text
      .normalize('NFD') // Decompose characters into base + diacritic
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const artistSlug = normalizeText(song.artist)
  const titleSlug = normalizeText(song.title)
  return `${artistSlug}-${titleSlug}.webp`
}
