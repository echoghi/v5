import sharp from 'sharp'

// Tiny inline previews that sit behind an image while it loads. Kept out of
// server-utils so sharp only lands in prerendered pages, not server functions.
const cache = new Map<string, Promise<string | undefined>>()

async function createPlaceholder(src: string) {
  try {
    const response = await fetch(src, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return undefined

    const buffer = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(16)
      .webp({ quality: 40 })
      .toBuffer()
    return `data:image/webp;base64,${buffer.toString('base64')}`
  } catch (error) {
    console.warn(`Could not create a placeholder for ${src}:`, error)
    return undefined
  }
}

export function getImagePlaceholder(src: string) {
  let placeholder = cache.get(src)
  if (!placeholder) {
    placeholder = createPlaceholder(src)
    cache.set(src, placeholder)
  }
  return placeholder
}
