const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sharp = require('sharp')
const {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3')

require('dotenv').config()

const repoRoot = process.cwd()
const photosDir = path.join(repoRoot, 'src/content/photos')
const sourcePhotosDir = path.resolve(
  repoRoot,
  process.env.PHOTO_SOURCE_DIR || 'photos-google',
)
const manifestPath = path.join(repoRoot, 'src/data/photo-manifest.json')
const dryRun = process.argv.includes('--dry-run')
const requestedAlbums = process.argv
  .slice(2)
  .filter((argument) => argument !== '--dry-run')

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

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${requiredConfig.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: requiredConfig.AWS_SECRET_ACCESS_KEY,
  },
})

const photoManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const availableAlbums = fs
  .readdirSync(photosDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const unknownAlbums = requestedAlbums.filter(
  (album) => !availableAlbums.includes(album),
)

if (unknownAlbums.length > 0) {
  throw new Error(
    `Unknown photo albums: ${unknownAlbums.join(', ')}. Available albums: ${availableAlbums.join(', ')}`,
  )
}

const albums = requestedAlbums.length > 0 ? requestedAlbums : availableAlbums
const metadataFields = [
  'camera',
  'lens',
  'location',
  'capturedAt',
  'captureOffset',
  'latitude',
  'longitude',
  'aperture',
  'focalLength',
  'iso',
]

function normalizeCameraName(camera) {
  return (
    {
      'DJI FC7303': 'DJI Mini 2',
    }[camera] ?? camera
  )
}

function generateImageHash(album, file, inputPath) {
  const hash = crypto.createHash('sha256')
  hash.update(album)
  hash.update('\0')
  hash.update(file)
  hash.update('\0')
  hash.update(fs.readFileSync(inputPath))
  return hash.digest('hex').slice(0, 16)
}

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

  return keys.sort()
}

function getPreviewId(key) {
  return path
    .basename(key)
    .replace('-preview', '')
    .replace(/\.[^.]+$/, '')
}

async function getObjectBuffer(key) {
  const response = await r2.send(
    new GetObjectCommand({ Bucket: requiredConfig.BUCKET, Key: key }),
  )
  if (!response.Body) throw new Error(`R2 returned an empty body for ${key}`)
  return Buffer.from(await response.Body.transformToByteArray())
}

async function createSignature(input) {
  const { data, info } = await sharp(input, {
    failOnError: false,
    unlimited: true,
  })
    .rotate()
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

  const color = await sharp(input, { failOnError: false, unlimited: true })
    .rotate()
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

function copyMetadata(sourceEntry, targetEntry, sourceHash) {
  const mergedEntry = { ...targetEntry, sourceHash }
  if (mergedEntry.camera) {
    mergedEntry.camera = normalizeCameraName(mergedEntry.camera)
  }

  for (const field of metadataFields) {
    if (
      (mergedEntry[field] === undefined || mergedEntry[field] === '') &&
      sourceEntry[field] !== undefined &&
      sourceEntry[field] !== ''
    ) {
      mergedEntry[field] =
        field === 'camera'
          ? normalizeCameraName(sourceEntry[field])
          : sourceEntry[field]
    }
  }

  return mergedEntry
}

async function syncAlbum(album) {
  const sourceDir = path.join(sourcePhotosDir, `${album}-source`)
  if (!fs.existsSync(sourceDir)) {
    console.log(`${album}: no local source directory`)
    return { matched: 0, legacy: 0, unmatched: 0 }
  }

  const localPhotos = fs
    .readdirSync(sourceDir)
    .filter((file) => /\.(heic|heif|jpe?g|png|webp)$/i.test(file))
    .map((file) => {
      const inputPath = path.join(sourceDir, file)
      const id = generateImageHash(album, file, inputPath)
      return {
        id,
        inputPath,
        manifestEntry: photoManifest[`${album}/${id}`] ?? {},
      }
    })
  const localById = new Map(localPhotos.map((photo) => [photo.id, photo]))
  const previewKeys = await listPreviewKeys(album)
  const directIds = new Set(
    previewKeys.map(getPreviewId).filter((id) => localById.has(id)),
  )
  const legacyKeys = previewKeys.filter(
    (key) => !directIds.has(getPreviewId(key)),
  )
  const localCandidates = localPhotos.filter(
    (photo) => !directIds.has(photo.id),
  )

  for (const id of directIds) {
    const localPhoto = localById.get(id)
    const manifestKey = `${album}/${id}`
    photoManifest[manifestKey] = copyMetadata(
      localPhoto.manifestEntry,
      photoManifest[manifestKey] ?? {},
      id,
    )
  }

  if (legacyKeys.length === 0) {
    console.log(
      `${album}: ${directIds.size} current hashes, no legacy matches needed`,
    )
    return { matched: directIds.size, legacy: 0, unmatched: 0 }
  }

  console.log(
    `${album}: fingerprinting ${legacyKeys.length} legacy previews against ${localCandidates.length} sources`,
  )
  const [remotePhotos, signedLocalPhotos] = await Promise.all([
    mapWithConcurrency(legacyKeys, 8, async (key) => ({
      key,
      id: getPreviewId(key),
      signature: await createSignature(await getObjectBuffer(key)),
    })),
    mapWithConcurrency(localCandidates, 6, async (photo) => ({
      ...photo,
      signature: await createSignature(photo.inputPath),
    })),
  ])

  const candidatePairs = []
  for (const remotePhoto of remotePhotos) {
    for (const localPhoto of signedLocalPhotos) {
      candidatePairs.push({
        remotePhoto,
        localPhoto,
        distance: signatureDistance(
          remotePhoto.signature,
          localPhoto.signature,
        ),
      })
    }
  }
  candidatePairs.sort((left, right) => left.distance - right.distance)

  const usedRemoteIds = new Set()
  const usedLocalIds = new Set()
  const matches = []

  for (const pair of candidatePairs) {
    if (pair.distance > 45) break
    if (
      usedRemoteIds.has(pair.remotePhoto.id) ||
      usedLocalIds.has(pair.localPhoto.id)
    ) {
      continue
    }

    usedRemoteIds.add(pair.remotePhoto.id)
    usedLocalIds.add(pair.localPhoto.id)
    matches.push(pair)
    if (
      usedRemoteIds.size === remotePhotos.length ||
      usedLocalIds.size === signedLocalPhotos.length
    ) {
      break
    }
  }

  const distances = matches.map((match) => match.distance)
  const maximumDistance = distances.length > 0 ? Math.max(...distances) : 0
  const averageDistance =
    distances.length > 0
      ? distances.reduce((total, distance) => total + distance, 0) /
        distances.length
      : 0

  for (const match of matches) {
    const manifestKey = `${album}/${match.remotePhoto.id}`
    photoManifest[manifestKey] = copyMetadata(
      match.localPhoto.manifestEntry,
      photoManifest[manifestKey] ?? {},
      match.localPhoto.id,
    )
  }

  console.log(
    `${album}: matched ${matches.length} legacy previews (average distance ${averageDistance.toFixed(2)}, maximum ${maximumDistance.toFixed(2)})`,
  )
  return {
    matched: directIds.size + matches.length,
    legacy: matches.length,
    unmatched: localPhotos.length - directIds.size - matches.length,
  }
}

;(async () => {
  const totals = { matched: 0, legacy: 0, unmatched: 0 }

  for (const album of albums) {
    const result = await syncAlbum(album)
    totals.matched += result.matched
    totals.legacy += result.legacy
    totals.unmatched += result.unmatched
  }

  if (!dryRun) {
    const sortedManifest = Object.fromEntries(
      Object.entries(photoManifest).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    )
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(sortedManifest, null, 2)}\n`,
    )
  }

  console.log(
    `${dryRun ? 'Dry run:' : 'Done:'} ${totals.matched} remote photos linked, ` +
      `${totals.legacy} legacy hashes matched, ${totals.unmatched} local sources not published`,
  )
})()
