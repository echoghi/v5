import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SongData } from '@/consts'

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

export async function loadWaveformData(
  id: string,
  songId: string,
): Promise<number[]> {
  try {
    const waveformPath = `/audio/${id}/${songId}-waveform.json`

    const response = await fetch(waveformPath)
    if (!response.ok) {
      console.warn(`Waveform file not found: ${waveformPath}`)
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.warn(`Failed to load waveform data for ${songId}:`, error)
    return []
  }
}

export async function getSongDataById(
  locationId: string,
  songId: string,
): Promise<SongData | null> {
  try {
    // Import songs from consts to find the song by ID
    const { songs } = await import('@/consts')
    const locationSongs = songs[locationId as keyof typeof songs]

    if (!locationSongs) {
      console.warn(`Location not found: ${locationId}`)
      return null
    }

    const song = locationSongs.find((s) => s.id === songId)
    if (!song) {
      console.warn(`Song not found: ${songId} in location ${locationId}`)
      return null
    }

    // Generate the MP3 source path
    const mp3Src = `/audio/${locationId}/${songId}.mp3`

    const albumCover = `https://cdn.emile.sh/albums/${songId}.webp`

    // Load waveform data
    const waveform = await loadWaveformData(locationId, songId)

    return {
      title: song.title,
      artist: song.artist,
      id: song.id,
      maxHeight: song.maxHeight,
      waveform,
      albumCover,
      mp3Src,
    }
  } catch (error) {
    console.warn(
      `Failed to get song data for ${songId} in ${locationId}:`,
      error,
    )
    return null
  }
}
