// ISO 3166 codes by English country name, the way photo locations and the now
// page spell them ("United States", "Vietnam"). Built from the names the
// runtime already knows, so a new country needs no entry here.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const codesByName = new Map<string, string>()

for (const first of letters) {
  for (const second of letters) {
    const code = first + second
    const name = regionNames.of(code)
    // Codes that aren't assigned come back unchanged.
    if (name && name !== code) codesByName.set(name, code)
  }
}

export function getCountryCode(name: string) {
  return codesByName.get(name)
}
