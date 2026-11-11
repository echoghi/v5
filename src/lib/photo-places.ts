import globePlaces from '@/data/globe-places.json'

// A place on the homepage globe. Most are a single photo location. A city or
// island lists the `locations` it gathers, so its neighborhoods share one dot.
export type PhotoPlace = {
  place: string
  locations?: string[]
  photo?: string
  focus?: string
}

// In the order they get first pick of the space on the globe.
export const photoPlaces: PhotoPlace[] = globePlaces

const placeByLocation = new Map(
  photoPlaces.flatMap(({ place, locations }) =>
    (locations ?? [place]).map((location) => [location, place] as const),
  ),
)

// The place a photo's location counts toward: its city or island where
// src/data/globe-places.json groups it into one, otherwise the location itself.
export function getPlaceName(location: string) {
  return placeByLocation.get(location) ?? location
}
