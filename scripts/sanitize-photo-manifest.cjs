const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const manifestPath = path.join(repoRoot, 'src/data/photo-manifest.json')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
let sanitizedEntries = 0

for (const entry of Object.values(manifest)) {
  const hadPrivateMetadata =
    entry.latitude !== undefined ||
    entry.longitude !== undefined ||
    entry.captureOffset !== undefined ||
    (typeof entry.capturedAt === 'string' && entry.capturedAt.includes('T'))

  delete entry.latitude
  delete entry.longitude
  delete entry.captureOffset

  if (typeof entry.capturedAt === 'string') {
    entry.capturedAt =
      entry.capturedAt.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? entry.capturedAt
  }

  if (hadPrivateMetadata) sanitizedEntries += 1
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `Sanitized private metadata in ${sanitizedEntries} of ${Object.keys(manifest).length} manifest entries`,
)
