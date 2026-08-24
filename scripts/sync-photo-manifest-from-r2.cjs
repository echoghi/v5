const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} = require('@aws-sdk/client-s3')

require('dotenv').config()

const requiredConfig = [
  'ACCOUNT_ID',
  'BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
]
const missingConfig = requiredConfig.filter((name) => !process.env[name])

if (missingConfig.length > 0) {
  throw new Error(
    `Missing required R2 configuration: ${missingConfig.join(', ')}`,
  )
}

const repoRoot = process.cwd()
const photosDir = path.join(repoRoot, 'src/content/photos')
const manifestPath = path.join(repoRoot, 'src/data/photo-manifest.json')
const requestedAlbums = process.argv.slice(2)
const availableAlbums = fs
  .readdirSync(photosDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const unknownAlbums = requestedAlbums.filter(
  (album) => !availableAlbums.includes(album),
)

if (unknownAlbums.length > 0) {
  throw new Error(`Unknown photo directories: ${unknownAlbums.join(', ')}`)
}

const albums = requestedAlbums.length > 0 ? requestedAlbums : availableAlbums
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {}

async function listPreviewKeys(album) {
  const keys = []
  let continuationToken

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.BUCKET,
        Prefix: `${album}/`,
        ContinuationToken: continuationToken,
      }),
    )
    keys.push(
      ...(response.Contents ?? []).flatMap((object) =>
        object.Key?.includes('-preview') ? [object.Key] : [],
      ),
    )
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

async function readDimensions(key) {
  const response = await client.send(
    new GetObjectCommand({ Bucket: process.env.BUCKET, Key: key }),
  )
  if (!response.Body) throw new Error(`R2 returned an empty body for ${key}`)

  const bytes = await response.Body.transformToByteArray()
  const metadata = await sharp(Buffer.from(bytes), {
    failOnError: false,
  }).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read dimensions for ${key}`)
  }

  return { width: metadata.width, height: metadata.height }
}

async function mapWithConcurrency(items, limit, mapper) {
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex
        nextIndex += 1
        await mapper(items[index], index)
      }
    },
  )
  await Promise.all(workers)
}

;(async () => {
  for (const album of albums) {
    const previewKeys = await listPreviewKeys(album)
    const missingKeys = previewKeys.filter((key) => {
      const id = key
        .split('/')
        .pop()
        .replace('-preview', '')
        .replace(/\.[^.]+$/, '')
      return !manifest[`${album}/${id}`]
    })

    console.log(
      `${album}: ${previewKeys.length} remote previews, ${missingKeys.length} dimensions to sync`,
    )

    await mapWithConcurrency(missingKeys, 12, async (key) => {
      const id = key
        .split('/')
        .pop()
        .replace('-preview', '')
        .replace(/\.[^.]+$/, '')
      manifest[`${album}/${id}`] = await readDimensions(key)
    })
  }

  const sortedManifest = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  )
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(sortedManifest, null, 2)}\n`)
  console.log(`Synced ${Object.keys(sortedManifest).length} photo dimensions`)
})()
