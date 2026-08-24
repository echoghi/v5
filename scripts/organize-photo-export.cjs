const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const sharp = require('sharp')
const {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3')

require('dotenv').config()

const repoRoot = process.cwd()
const exportDir = path.join(repoRoot, 'photos-google', 'export')
const outputDir = path.join(repoRoot, 'photos-google')
const normalizedDir = path.join(outputDir, 'normalized')
const collectionsDir = path.join(repoRoot, 'src/content/photos')
const dryRun = process.argv.includes('--dry-run')
const imagePattern = /\.(heic|heif|jpe?g|png|webp)$/i
const legacySourceDir = path.join(repoRoot, 'photos')

const requiredConfig = {
  ACCOUNT_ID: process.env.ACCOUNT_ID,
  BUCKET: process.env.BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
}
const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingConfig.length > 0) {
  throw new Error(
    `Missing required R2 configuration: ${missingConfig.join(', ')}`,
  )
}

if (!fs.existsSync(exportDir)) {
  throw new Error(`Google Photos export not found: ${exportDir}`)
}

const albums = fs
  .readdirSync(collectionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const localFiles = fs
  .readdirSync(exportDir)
  .filter((file) => imagePattern.test(file))
  .sort()

function normalizeLocalFile(file) {
  const inputPath = path.join(exportDir, file)
  if (!/\.hei[cf]$/i.test(file)) {
    return { originalFile: file, outputFile: file, sourcePath: inputPath }
  }

  fs.mkdirSync(normalizedDir, { recursive: true })
  const outputFile = `${path.basename(file, path.extname(file))}.jpg`
  const sourcePath = path.join(normalizedDir, outputFile)
  if (!fs.existsSync(sourcePath)) {
    const result = spawnSync(
      'sips',
      ['-s', 'format', 'jpeg', inputPath, '--out', sourcePath],
      { encoding: 'utf8' },
    )
    if (result.status !== 0) {
      throw new Error(
        `Could not normalize ${file}: ${result.stderr || result.stdout}`,
      )
    }
  }
  return { originalFile: file, outputFile, sourcePath }
}

function normalizeFileStem(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/ \(\d+\)$/, '')
    .toLowerCase()
}

async function readMetadata(inputPath) {
  const exifr = require('exifr')
  try {
    return (await exifr.parse(inputPath, { reviveValues: false })) ?? {}
  } catch {
    const metadata = await sharp(inputPath, {
      failOnError: false,
      unlimited: true,
    }).metadata()
    if (!metadata.exif) return {}
    return (
      (await exifr.parse(metadata.exif.subarray(6), {
        reviveValues: false,
      })) ?? {}
    )
  }
}

function addIndexValue(index, key, album) {
  if (!key) return
  const albumsForKey = index.get(key) ?? new Set()
  albumsForKey.add(album)
  index.set(key, albumsForKey)
}

async function buildLegacyIndexes() {
  const names = new Map()
  const captureDates = new Map()
  if (!fs.existsSync(legacySourceDir)) return { names, captureDates }

  for (const sourceFolder of fs
    .readdirSync(legacySourceDir)
    .filter((folder) => folder.endsWith('-source'))) {
    const album = sourceFolder.replace(/-source$/, '')
    const albumDir = path.join(legacySourceDir, sourceFolder)
    for (const file of fs
      .readdirSync(albumDir)
      .filter((entry) => imagePattern.test(entry))) {
      addIndexValue(names, normalizeFileStem(file), album)
      const metadata = await readMetadata(path.join(albumDir, file))
      addIndexValue(captureDates, metadata.DateTimeOriginal, album)
    }
  }
  return { names, captureDates }
}

function uniqueIndexValue(index, key) {
  const values = key ? [...(index.get(key) ?? [])] : []
  return values.length === 1 ? values[0] : undefined
}

function classifyByMetadata(photo, legacyIndexes) {
  const legacyName = uniqueIndexValue(
    legacyIndexes.names,
    normalizeFileStem(photo.originalFile),
  )
  if (legacyName) return { album: legacyName, method: 'legacy filename' }

  const legacyDate = uniqueIndexValue(
    legacyIndexes.captureDates,
    photo.metadata.DateTimeOriginal,
  )
  if (legacyDate) return { album: legacyDate, method: 'capture timestamp' }

  const latitude = Number(photo.metadata.latitude)
  const longitude = Number(photo.metadata.longitude)
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    if (
      latitude >= 35 &&
      latitude <= 47.5 &&
      longitude >= 6 &&
      longitude <= 19
    ) {
      return { album: 'italy', method: 'GPS' }
    }
    if (
      latitude >= 19.5 &&
      latitude <= 22 &&
      longitude >= -157.5 &&
      longitude <= -154.5
    ) {
      return { album: 'maui', method: 'GPS' }
    }
    if (
      latitude >= 38.5 &&
      latitude <= 39.7 &&
      longitude >= -121 &&
      longitude <= -119
    ) {
      return { album: 'lake-tahoe', method: 'GPS' }
    }
    if (
      latitude >= 33.5 &&
      latitude <= 34.6 &&
      longitude >= -119.5 &&
      longitude <= -118
    ) {
      return { album: 'thousand-oaks', method: 'GPS' }
    }
    if (
      latitude >= 35 &&
      latitude <= 36.5 &&
      longitude >= -88 &&
      longitude <= -85
    ) {
      return { album: 'tennessee', method: 'GPS' }
    }
    if (
      latitude >= 8 &&
      latitude <= 24 &&
      longitude >= 104 &&
      longitude <= 110.5
    ) {
      return { album: 'vietnam', method: 'GPS' }
    }
    if (latitude >= 5 && latitude <= 21 && longitude >= 97 && longitude < 104) {
      return { album: 'thailand', method: 'GPS' }
    }
    if (
      latitude >= 37.2 &&
      latitude <= 37.6 &&
      longitude >= -122.3 &&
      longitude <= -122
    ) {
      return { album: 'palo-alto', method: 'GPS' }
    }
    if (
      latitude >= 36.4 &&
      latitude <= 38.5 &&
      longitude >= -123.5 &&
      longitude <= -121.5
    ) {
      return { album: 'san-francisco', method: 'GPS' }
    }
  }

  const capturedAt = String(photo.metadata.DateTimeOriginal ?? '')
  if (capturedAt >= '2018:05:24' && capturedAt <= '2018:08:30 23:59:59') {
    return { album: 'maui', method: 'trip date' }
  }
  if (capturedAt >= '2019:10:17' && capturedAt <= '2019:10:22 23:59:59') {
    return { album: 'italy', method: 'trip date' }
  }
  if (capturedAt >= '2025:05:02' && capturedAt <= '2025:05:17 23:59:59') {
    return { album: 'palo-alto', method: 'trip date' }
  }
  if (capturedAt >= '2026:04:18' && capturedAt <= '2026:05:04 23:59:59') {
    return { album: 'vietnam', method: 'trip date' }
  }
  if (capturedAt >= '2025:11:09' && capturedAt <= '2026:04:15 23:59:59') {
    return { album: 'thailand', method: 'trip date' }
  }
  if (capturedAt >= '2023:12:26' && capturedAt <= '2026:01:07 23:59:59') {
    return { album: 'tennessee', method: 'trip date' }
  }
  if (capturedAt >= '2019:01:01' && capturedAt <= '2021:12:31 23:59:59') {
    return { album: 'san-francisco', method: 'archive date' }
  }
  return { album: 'misc', method: 'fallback' }
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${requiredConfig.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: requiredConfig.AWS_SECRET_ACCESS_KEY,
  },
})

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  )
  return results
}

async function listPreviewKeys(album) {
  const keys = []
  let continuationToken

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: requiredConfig.BUCKET,
        Prefix: `${album}/`,
        ContinuationToken: continuationToken,
      }),
    )
    for (const object of response.Contents ?? []) {
      if (object.Key?.includes('-preview')) keys.push(object.Key)
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

async function getObjectBuffer(key) {
  const response = await r2.send(
    new GetObjectCommand({ Bucket: requiredConfig.BUCKET, Key: key }),
  )
  if (!response.Body) throw new Error(`R2 returned an empty body for ${key}`)
  return Buffer.from(await response.Body.transformToByteArray())
}

async function createSignature(input, trusted = false) {
  const options = {
    failOnError: false,
    ...(trusted ? { unlimited: true } : {}),
  }
  const image = sharp(input, options).rotate()
  const { data, info } = await image
    .clone()
    .resize(17, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const hash = Buffer.alloc(32)

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const bitIndex = y * 16 + x
      if (data[y * info.width + x] > data[y * info.width + x + 1]) {
        hash[Math.floor(bitIndex / 8)] |= 1 << (bitIndex % 8)
      }
    }
  }

  const color = await image
    .clone()
    .resize(8, 8, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()

  return { hash, color }
}

function countBits(value) {
  let bits = value
  let count = 0
  while (bits > 0) {
    count += bits & 1
    bits >>>= 1
  }
  return count
}

function signatureDistance(left, right) {
  let hammingDistance = 0
  for (let index = 0; index < left.hash.length; index += 1) {
    hammingDistance += countBits(left.hash[index] ^ right.hash[index])
  }

  let colorDistance = 0
  const colorLength = Math.min(left.color.length, right.color.length)
  for (let index = 0; index < colorLength; index += 1) {
    colorDistance += Math.abs(left.color[index] - right.color[index])
  }
  return hammingDistance + colorDistance / colorLength / 2
}

;(async () => {
  console.log(
    `Fingerprinting ${localFiles.length} Google originals against published previews...`,
  )
  const previewKeys = (
    await Promise.all(albums.map((album) => listPreviewKeys(album)))
  ).flat()
  const legacyIndexes = await buildLegacyIndexes()
  const [localPhotos, remotePhotos] = await Promise.all([
    mapWithConcurrency(localFiles, 4, async (file) => {
      const normalized = normalizeLocalFile(file)
      return {
        ...normalized,
        metadata: await readMetadata(normalized.sourcePath),
        signature: await createSignature(normalized.sourcePath, true),
      }
    }),
    mapWithConcurrency(previewKeys, 8, async (key) => ({
      key,
      album: key.split('/')[0],
      signature: await createSignature(await getObjectBuffer(key)),
    })),
  ])

  const pairs = []
  for (const localPhoto of localPhotos) {
    for (const remotePhoto of remotePhotos) {
      pairs.push({
        localPhoto,
        remotePhoto,
        distance: signatureDistance(
          localPhoto.signature,
          remotePhoto.signature,
        ),
      })
    }
  }
  pairs.sort((left, right) => left.distance - right.distance)

  const usedFiles = new Set()
  const usedRemoteKeys = new Set()
  const matches = []
  for (const pair of pairs) {
    if (
      usedFiles.has(pair.localPhoto.originalFile) ||
      usedRemoteKeys.has(pair.remotePhoto.key)
    ) {
      continue
    }
    usedFiles.add(pair.localPhoto.originalFile)
    usedRemoteKeys.add(pair.remotePhoto.key)
    matches.push(pair)
    if (usedFiles.size === localPhotos.length) break
  }

  const accepted = matches
    .filter((match) => match.distance <= 45)
    .map((match) => ({ ...match, method: 'visual match' }))
  const rejected = matches.filter((match) => match.distance > 45)
  const inferred = rejected.map((match) => ({
    ...match,
    ...classifyByMetadata(match.localPhoto, legacyIndexes),
  }))
  const assignments = [
    ...accepted.map((match) => ({
      ...match,
      album: match.remotePhoto.album,
    })),
    ...inferred,
  ]
  const albumCounts = {}
  const methodCounts = {}
  for (const assignment of assignments) {
    albumCounts[assignment.album] = (albumCounts[assignment.album] ?? 0) + 1
    methodCounts[assignment.method] = (methodCounts[assignment.method] ?? 0) + 1
  }

  console.log(`Published previews: ${remotePhotos.length}`)
  console.log(`Accepted matches: ${accepted.length}`)
  console.log(`Metadata-inferred exports: ${inferred.length}`)
  console.log(`Album assignments: ${JSON.stringify(albumCounts)}`)
  console.log(`Assignment methods: ${JSON.stringify(methodCounts)}`)
  if (rejected.length > 0) {
    const rejectedDistances = rejected
      .map((match) => match.distance)
      .sort((left, right) => left - right)
    console.log(
      `Rejected distance range: ${rejectedDistances[0].toFixed(2)}-${rejectedDistances.at(-1).toFixed(2)}`,
    )
    console.log(
      `Closest rejected: ${rejected
        .slice()
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 15)
        .map(
          (match) =>
            `${match.localPhoto.originalFile} -> ${match.remotePhoto.key} (${match.distance.toFixed(2)})`,
        )
        .join(', ')}`,
    )
    console.log(
      `Metadata-inferred files: ${rejected.map((match) => match.localPhoto.originalFile).join(', ')}`,
    )
  }

  if (dryRun) return
  for (const match of assignments) {
    const albumDir = path.join(outputDir, `${match.album}-source`)
    fs.mkdirSync(albumDir, { recursive: true })
    fs.copyFileSync(
      match.localPhoto.sourcePath,
      path.join(albumDir, match.localPhoto.outputFile),
    )
  }

  const sourceMap = Object.fromEntries(
    assignments
      .sort((left, right) =>
        `${left.album}/${left.localPhoto.outputFile}`.localeCompare(
          `${right.album}/${right.localPhoto.outputFile}`,
        ),
      )
      .map((match) => [
        `${match.album}/${match.localPhoto.outputFile}`,
        {
          source: match.localPhoto.originalFile,
          processedSource: match.localPhoto.outputFile,
          method: match.method,
          ...(match.method === 'visual match'
            ? {
                remotePreview: match.remotePhoto.key,
                distance: Number(match.distance.toFixed(2)),
              }
            : {}),
        },
      ]),
  )
  fs.writeFileSync(
    path.join(outputDir, 'source-map.json'),
    `${JSON.stringify(sourceMap, null, 2)}\n`,
  )
  console.log(`Organized sources written to ${outputDir}`)
})()
