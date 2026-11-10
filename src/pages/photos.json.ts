import { getPhotostreamImages } from '@/lib/server-utils'
import { getCollection } from 'astro:content'

// Every photo in the stream, for the homepage contact sheet's shuffle button.
// Prerendered, so it's fetched as a static file only when someone shuffles.
export async function GET() {
  const photos = await getPhotostreamImages(await getCollection('photos'))

  return Response.json(
    photos.map((photo) => ({
      slug: photo.slug,
      src: photo.previewSrc,
      width: photo.width,
      height: photo.height,
      location: photo.location,
    })),
  )
}
