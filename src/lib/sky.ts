// Rough sun and moon positions for the footer sky. Accurate to well under a
// degree, which is plenty for drawing a sun or a moon.

const RAD = Math.PI / 180
const DAY_MS = 86_400_000
const J2000_MS = Date.UTC(2000, 0, 1, 12)

// A known new moon (2000-01-06 18:14 UTC) and the mean length of a lunar month.
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC_MONTH_DAYS = 29.530588853

/** The sun's altitude above the horizon in degrees. */
export function getSunAltitude(
  date: Date,
  latitude: number,
  longitude: number,
) {
  const days = (date.getTime() - J2000_MS) / DAY_MS
  const meanAnomaly = (357.529 + 0.98560028 * days) * RAD
  const meanLongitude = 280.459 + 0.98564736 * days
  const eclipticLongitude =
    (meanLongitude +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) *
    RAD
  const obliquity = (23.439 - 0.00000036 * days) * RAD

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  )
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  )
  const siderealTime = (18.697374558 + 24.06570982441908 * days) * 15
  const hourAngle = (siderealTime + longitude) * RAD - rightAscension

  const lat = latitude * RAD
  return (
    Math.asin(
      Math.sin(lat) * Math.sin(declination) +
        Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
    ) / RAD
  )
}

/** Where the moon is in its cycle: 0 is new, 0.5 is full. */
export function getMoonPhase(date: Date) {
  const days = (date.getTime() - NEW_MOON_MS) / DAY_MS
  const phase = (days / SYNODIC_MONTH_DAYS) % 1
  return phase < 0 ? phase + 1 : phase
}

export function getMoonPhaseName(phase: number) {
  if (phase < 0.03 || phase > 0.97) return 'New moon'
  if (phase < 0.22) return 'Waxing crescent moon'
  if (phase < 0.28) return 'First quarter moon'
  if (phase < 0.47) return 'Waxing gibbous moon'
  if (phase < 0.53) return 'Full moon'
  if (phase < 0.72) return 'Waning gibbous moon'
  if (phase < 0.78) return 'Last quarter moon'
  return 'Waning crescent moon'
}

/**
 * The lit part of a moon of radius `r` centered at (`cx`, `cy`), as an SVG
 * path. Waxing moons are lit on the right, as seen from the north.
 */
export function getMoonPath(phase: number, cx: number, cy: number, r: number) {
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  const terminator = Math.abs(Math.cos(2 * Math.PI * phase)) * r
  const waxing = phase < 0.5
  const crescent = phase < 0.25 || phase > 0.75

  // Trace the lit limb from top to bottom, then come back up along the
  // terminator, which bulges toward the lit side for a crescent.
  const limbSweep = waxing ? 1 : 0
  const terminatorSweep = waxing === crescent ? 0 : 1
  return `M ${top} A ${r} ${r} 0 0 ${limbSweep} ${bottom} A ${terminator} ${r} 0 0 ${terminatorSweep} ${top} Z`
}
