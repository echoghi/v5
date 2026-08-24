export const prerender = false

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import photoManifest from '@/data/photo-manifest.json'

import type { APIRoute } from 'astro'

type ReviewNote = {
  note: string
  reviewed: true
  updatedAt: string
  processedAt?: string
}

type ReviewNotes = Record<string, ReviewNote>
type PhotoManifest = Record<
  string,
  {
    camera?: string
    hidden?: boolean
    location?: string
    publicNote?: string
    [key: string]: unknown
  }
>

const notesPath = path.resolve(
  process.cwd(),
  'src/data/photo-review-notes.json',
)
const manifestPath = path.resolve(process.cwd(), 'src/data/photo-manifest.json')
const photoKeyPattern = /^[a-z0-9-]+\/[a-z0-9_-]+$/i
let writeQueue = Promise.resolve()

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isLocalDevelopment(url: URL) {
  return (
    import.meta.env.DEV &&
    ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  )
}

async function readNotes(): Promise<ReviewNotes> {
  try {
    const contents = await readFile(notesPath, 'utf8')
    const parsed = JSON.parse(contents) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ReviewNotes)
      : {}
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

async function readManifest(): Promise<PhotoManifest> {
  const contents = await readFile(manifestPath, 'utf8')
  const parsed = JSON.parse(contents) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Photo manifest is not a JSON object')
  }
  return parsed as PhotoManifest
}

export const GET: APIRoute = async ({ url }) => {
  if (!isLocalDevelopment(url)) return json({ error: 'Not found' }, 404)

  try {
    return json({ notes: await readNotes() })
  } catch (error) {
    console.error('Unable to read photo review notes:', error)
    return json({ error: 'Unable to read local review notes' }, 500)
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!isLocalDevelopment(url)) return json({ error: 'Not found' }, 404)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Expected a JSON request body' }, 400)
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { photoKey, note, publicNote, hidden, location, camera } = body as Record<
    string,
    unknown
  >
  if (typeof photoKey !== 'string' || !photoKeyPattern.test(photoKey)) {
    return json({ error: 'Invalid photo key' }, 400)
  }
  if (!(photoKey in photoManifest)) {
    return json({ error: 'Photo key is not in the manifest' }, 404)
  }
  if (typeof note !== 'string' || note.length > 10_000) {
    return json({ error: 'Notes must be 10,000 characters or fewer' }, 400)
  }
  if (
    publicNote !== undefined &&
    (typeof publicNote !== 'string' || publicNote.length > 2_000)
  ) {
    return json(
      { error: 'Public photo notes must be 2,000 characters or fewer' },
      400,
    )
  }
  if (hidden !== undefined && typeof hidden !== 'boolean') {
    return json({ error: 'Hidden must be a boolean' }, 400)
  }
  if (
    location !== undefined &&
    (typeof location !== 'string' || location.length > 500)
  ) {
    return json({ error: 'Locations must be 500 characters or fewer' }, 400)
  }
  if (
    camera !== undefined &&
    (typeof camera !== 'string' || camera.length > 500)
  ) {
    return json({ error: 'Camera names must be 500 characters or fewer' }, 400)
  }

  const entry: ReviewNote = {
    note: note.trim(),
    reviewed: true,
    updatedAt: new Date().toISOString(),
  }

  let savedNotes: ReviewNotes = {}
  let savedPublicNote: string | undefined
  let savedHidden: boolean | undefined
  let savedLocation: string | undefined
  let savedCamera: string | undefined
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      savedNotes = await readNotes()
      savedNotes[photoKey] = entry
      if (
        typeof publicNote === 'string' ||
        typeof hidden === 'boolean' ||
        typeof location === 'string' ||
        typeof camera === 'string'
      ) {
        const manifest = await readManifest()
        const manifestEntry = manifest[photoKey]
        if (!manifestEntry) throw new Error('Photo key is not in the manifest')

        if (typeof publicNote === 'string') {
          savedPublicNote = publicNote.trim() || undefined
          if (savedPublicNote) manifestEntry.publicNote = savedPublicNote
          else delete manifestEntry.publicNote
        }
        if (typeof hidden === 'boolean') {
          savedHidden = hidden
          if (hidden) manifestEntry.hidden = true
          else delete manifestEntry.hidden
        }
        if (typeof location === 'string') {
          savedLocation = location.trim() || undefined
          if (savedLocation) manifestEntry.location = savedLocation
          else delete manifestEntry.location
          delete manifestEntry.locationSource
        }
        if (typeof camera === 'string') {
          savedCamera = camera.trim() || undefined
          if (savedCamera) manifestEntry.camera = savedCamera
          else delete manifestEntry.camera
        }

        await writeFile(
          manifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`,
          'utf8',
        )
      }
      await writeFile(
        notesPath,
        `${JSON.stringify(savedNotes, null, 2)}\n`,
        'utf8',
      )
    })

  try {
    await writeQueue
    return json({
      entry,
      publicNote: savedPublicNote ?? '',
      hidden: savedHidden ?? false,
      location: savedLocation ?? '',
      camera: savedCamera ?? '',
      reviewedCount: Object.keys(savedNotes).length,
    })
  } catch (error) {
    console.error('Unable to save photo review note:', error)
    return json({ error: 'Unable to save the note locally' }, 500)
  }
}
