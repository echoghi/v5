const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

require('dotenv').config()

const repoRoot = process.cwd()
const manifestPath = path.join(repoRoot, 'src/data/photo-manifest.json')
const sourcePhotosDir = path.resolve(
  repoRoot,
  process.env.PHOTO_SOURCE_DIR || 'photos-google',
)
const datasetDir = path.join(sourcePhotosDir, 'geonames')
const citiesPath = path.join(datasetDir, 'cities500.txt')
const citiesArchivePath = path.join(datasetDir, 'cities500.zip')
const admin1Path = path.join(datasetDir, 'admin1CodesASCII.txt')
const countriesPath = path.join(datasetDir, 'countryInfo.txt')
const refresh = process.argv.includes('--refresh')
const downloadBaseUrl = 'https://download.geonames.org/export/dump'

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function downloadFile(name, destination) {
  console.log(`Downloading GeoNames ${name}...`)
  const response = await fetch(`${downloadBaseUrl}/${name}`, {
    headers: {
      'User-Agent': 'emile.sh-photo-metadata/1.0 (https://emile.sh)',
    },
  })
  if (!response.ok) {
    throw new Error(`Could not download ${name}: HTTP ${response.status}`)
  }
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()))
}

async function ensureDataset() {
  fs.mkdirSync(datasetDir, { recursive: true })
  if (!fs.existsSync(citiesPath)) {
    if (!fs.existsSync(citiesArchivePath)) {
      await downloadFile('cities500.zip', citiesArchivePath)
    }
    console.log('Extracting GeoNames cities...')
    execFileSync('unzip', ['-oq', citiesArchivePath, '-d', datasetDir])
  }
  if (!fs.existsSync(admin1Path)) {
    await downloadFile('admin1CodesASCII.txt', admin1Path)
  }
  if (!fs.existsSync(countriesPath)) {
    await downloadFile('countryInfo.txt', countriesPath)
  }
}

function parseLookup(filePath, parseLine) {
  return new Map(
    fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => parseLine(line.split('\t'))),
  )
}

function loadDataset() {
  const admin1Names = parseLookup(admin1Path, (fields) => [
    fields[0],
    fields[1],
  ])
  const countryNames = parseLookup(countriesPath, (fields) => [
    fields[0],
    fields[4],
  ])
  const cities = fs
    .readFileSync(citiesPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const fields = line.split('\t')
      return {
        name: fields[1],
        latitude: Number(fields[4]),
        longitude: Number(fields[5]),
        countryCode: fields[8],
        admin1Code: fields[10],
      }
    })
    .filter(
      (city) =>
        Number.isFinite(city.latitude) && Number.isFinite(city.longitude),
    )

  return { admin1Names, countryNames, cities }
}

function distanceSquared(latitude, longitude, city) {
  const latitudeDelta = city.latitude - latitude
  const longitudeDelta =
    (city.longitude - longitude) * Math.cos((latitude * Math.PI) / 180)
  return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta
}

function nearestPlace(latitude, longitude, dataset) {
  let nearestCity
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const city of dataset.cities) {
    const distance = distanceSquared(latitude, longitude, city)
    if (distance < nearestDistance) {
      nearestCity = city
      nearestDistance = distance
    }
  }

  if (!nearestCity) return ''
  const region = dataset.admin1Names.get(
    `${nearestCity.countryCode}.${nearestCity.admin1Code}`,
  )
  const country = dataset.countryNames.get(nearestCity.countryCode)
  return [...new Set([nearestCity.name, region, country].filter(Boolean))].join(
    ', ',
  )
}

async function main() {
  await ensureDataset()
  console.log('Loading the offline GeoNames place index...')
  const dataset = loadDataset()
  const manifest = readJson(manifestPath, {})
  let resolvedPhotos = 0
  let skippedPhotos = 0

  for (const entry of Object.values(manifest)) {
    if (!Number.isFinite(entry.latitude) || !Number.isFinite(entry.longitude)) {
      skippedPhotos += 1
      continue
    }
    if (
      entry.location &&
      !(refresh && entry.locationSource === 'geonames-nearest-place')
    ) {
      skippedPhotos += 1
      continue
    }

    const location = nearestPlace(entry.latitude, entry.longitude, dataset)
    if (!location) {
      skippedPhotos += 1
      continue
    }
    entry.location = location
    entry.locationSource = 'geonames-nearest-place'
    resolvedPhotos += 1
  }

  writeJson(manifestPath, manifest)
  console.log(
    `Added offline GPS-derived locations to ${resolvedPhotos} photos (${skippedPhotos} unchanged)`,
  )
  console.log('Location labels use the nearest GeoNames place (CC BY 4.0)')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
