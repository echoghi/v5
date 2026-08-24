const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const exifr = require('exifr')
const crypto = require('crypto')
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3')

require('dotenv').config()

// ==== CONFIGURATION ====
const cliArgs = process.argv.slice(2)
const manifestOnly = cliArgs.includes('--manifest-only')
const metadataOnly = cliArgs.includes('--metadata-only')
const requestedBaseDirs = cliArgs.filter(
  (arg) => arg !== '--manifest-only' && arg !== '--metadata-only',
)
const ACCOUNT_ID = process.env.ACCOUNT_ID
const BUCKET = process.env.BUCKET
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const missingConfig = [
  ['ACCOUNT_ID', ACCOUNT_ID],
  ['BUCKET', BUCKET],
  ['AWS_ACCESS_KEY_ID', AWS_ACCESS_KEY_ID],
  ['AWS_SECRET_ACCESS_KEY', AWS_SECRET_ACCESS_KEY],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (!manifestOnly && !metadataOnly && missingConfig.length > 0) {
  throw new Error(
    `Missing required R2 configuration: ${missingConfig.join(', ')}`,
  )
}

const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`

const r2 =
  manifestOnly || metadataOnly
    ? null
    : new S3Client({
        region: 'auto',
        endpoint: ENDPOINT,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      })

// ==== PATHS ====
const repoRoot = process.cwd()
const photosDir = path.join(repoRoot, 'src/content/photos')
const sourcePhotosDir = path.resolve(
  repoRoot,
  process.env.PHOTO_SOURCE_DIR || 'photos-google',
)
const manifestPath = path.join(repoRoot, 'src/data/photo-manifest.json')
const trustedImageOptions = { failOnError: false, unlimited: true }

// ==== HELPERS ====
function generateImageHash(baseDir, file, inputPath) {
  const hash = crypto.createHash('sha256')
  hash.update(baseDir)
  hash.update('\0')
  hash.update(file)
  hash.update('\0')
  hash.update(fs.readFileSync(inputPath))
  return hash.digest('hex').slice(0, 16)
}

function cleanExifText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCameraName(camera) {
  return (
    {
      'DJI FC7303': 'DJI Mini 2',
    }[camera] ?? camera
  )
}

function formatCamera(make, model) {
  const cleanMake = cleanExifText(make).replace(/\s+CORPORATION$/i, '')
  const cleanModel = cleanExifText(model)

  if (!cleanModel) return normalizeCameraName(cleanMake)
  if (
    !cleanMake ||
    cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())
  ) {
    return normalizeCameraName(cleanModel)
  }

  return normalizeCameraName(`${cleanMake} ${cleanModel}`)
}

function normalizeCapturedAt(value) {
  if (typeof value !== 'string') return undefined
  const match = value.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  )
  if (!match) return undefined

  const [, year, month, day, hour, minute, second] = match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

function finiteNumber(value, precision = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return undefined
  return Number(number.toFixed(precision))
}

async function readPhotoMetadata(inputPath) {
  try {
    let exif
    try {
      exif = await exifr.parse(inputPath, { reviveValues: false })
    } catch {
      const imageMetadata = await sharp(
        inputPath,
        trustedImageOptions,
      ).metadata()
      exif = imageMetadata.exif
        ? await exifr.parse(imageMetadata.exif.subarray(6), {
            reviveValues: false,
          })
        : undefined
    }
    if (!exif) return {}

    const camera = formatCamera(exif.Make, exif.Model)
    const lens = cleanExifText(exif.LensModel)
    const capturedAt = normalizeCapturedAt(exif.DateTimeOriginal)
    const captureOffset = cleanExifText(exif.OffsetTimeOriginal)
    const latitude = finiteNumber(exif.latitude, 6)
    const longitude = finiteNumber(exif.longitude, 6)
    const aperture = finiteNumber(exif.FNumber)
    const focalLength = finiteNumber(exif.FocalLength)
    const iso = finiteNumber(exif.ISO, 0)

    return {
      ...(camera ? { camera } : {}),
      ...(lens ? { lens } : {}),
      ...(capturedAt ? { capturedAt } : {}),
      ...(captureOffset ? { captureOffset } : {}),
      ...(latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : {}),
      ...(aperture !== undefined ? { aperture } : {}),
      ...(focalLength !== undefined ? { focalLength } : {}),
      ...(iso !== undefined ? { iso } : {}),
    }
  } catch (error) {
    console.warn(
      `Could not read photo metadata for ${path.relative(repoRoot, inputPath)}:`,
      error.message,
    )
    return {}
  }
}

function mergePhotoMetadata(existingEntry, sourceMetadata) {
  const mergedEntry = { ...existingEntry }
  if (mergedEntry.camera) {
    mergedEntry.camera = normalizeCameraName(mergedEntry.camera)
  }

  for (const [key, value] of Object.entries(sourceMetadata)) {
    if (mergedEntry[key] === undefined || mergedEntry[key] === '') {
      mergedEntry[key] = value
    }
  }

  return mergedEntry
}

async function clearBucket(baseDirsToClear) {
  if (!r2) return
  const prefixesToClear = baseDirsToClear.map((baseDir) => `${baseDir}/`)
  const isTargeted = prefixesToClear.length > 0

  if (isTargeted) {
    console.log(
      `🗑️  Clearing targeted R2 prefixes: ${prefixesToClear.join(', ')}`,
    )
  } else {
    console.log('🗑️  Clearing bucket before upload (excluding albums/)...')
  }

  let continuationToken

  do {
    const listResp = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      }),
    )

    if (listResp.Contents && listResp.Contents.length > 0) {
      const objectsToDelete = listResp.Contents.filter((obj) => {
        if (!obj.Key) {
          return false
        }

        if (isTargeted) {
          return prefixesToClear.some((prefix) => obj.Key.startsWith(prefix))
        }

        // ❌ exclude anything under albums/
        return !obj.Key.startsWith('albums/')
      }).map((obj) => ({ Key: obj.Key }))

      if (objectsToDelete.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
              Objects: objectsToDelete,
            },
          }),
        )
        console.log(`Deleted ${objectsToDelete.length} objects`)
      } else {
        console.log('No deletable objects in this batch')
      }
    }

    continuationToken = listResp.NextContinuationToken
  } while (continuationToken)

  if (isTargeted) {
    console.log('✅ Targeted prefixes cleared')
  } else {
    console.log('✅ Bucket cleared (albums/ preserved)')
  }
}

async function uploadToR2(key, buffer, contentType) {
  if (!r2) return
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  console.log(`📤 Uploaded ${key}`)
}

// ==== MAIN ====
;(async () => {
  // Discover base directories
  const allBaseDirs = fs
    .readdirSync(photosDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  const unknownBaseDirs = requestedBaseDirs.filter(
    (baseDir) => !allBaseDirs.includes(baseDir),
  )

  if (unknownBaseDirs.length > 0) {
    throw new Error(
      `Unknown photo directories: ${unknownBaseDirs.join(', ')}. Available directories: ${allBaseDirs.join(', ')}`,
    )
  }

  const baseDirs =
    requestedBaseDirs.length > 0 ? requestedBaseDirs : allBaseDirs

  const existingManifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {}
  let photoManifest = metadataOnly ? { ...existingManifest } : {}

  if (requestedBaseDirs.length > 0 && !metadataOnly) {
    photoManifest = { ...existingManifest }
    for (const baseDir of requestedBaseDirs) {
      for (const key of Object.keys(photoManifest)) {
        if (key.startsWith(`${baseDir}/`)) delete photoManifest[key]
      }
    }
  }

  console.log(`Found directories: ${baseDirs.join(', ')}`)

  // Clear bucket or selected prefixes first
  if (!manifestOnly && !metadataOnly) await clearBucket(requestedBaseDirs)

  sharp.cache(false)
  const metadataSummary = {
    photos: 0,
    camera: 0,
    lens: 0,
    gps: 0,
    capturedAt: 0,
  }

  for (const baseDir of baseDirs) {
    const inputDir = path.join(sourcePhotosDir, `${baseDir}-source`)

    if (!fs.existsSync(inputDir)) {
      console.log(`Skipping ${baseDir} (no source dir: ${inputDir})`)
      continue
    }

    console.log(`Processing directory: ${baseDir}`)

    const files = fs
      .readdirSync(inputDir)
      .filter(
        (f) => f !== '.DS_Store' && /\.(heic|heif|jpe?g|png|webp)$/i.test(f),
      )

    if (files.length === 0) {
      console.log(`No images in ${baseDir}`)
      continue
    }

    for (const file of files) {
      const inputPath = path.join(inputDir, file)
      const extension = path.extname(file)
      const imageHash = generateImageHash(baseDir, file, inputPath)
      const manifestKey = `${baseDir}/${imageHash}`
      const sourceMetadata = await readPhotoMetadata(inputPath)
      const existingEntry = existingManifest[manifestKey] ?? {}
      const manifestEntry = mergePhotoMetadata(existingEntry, sourceMetadata)

      metadataSummary.photos += 1
      if (sourceMetadata.camera) metadataSummary.camera += 1
      if (sourceMetadata.lens) metadataSummary.lens += 1
      if (
        sourceMetadata.latitude !== undefined &&
        sourceMetadata.longitude !== undefined
      ) {
        metadataSummary.gps += 1
      }
      if (sourceMetadata.capturedAt) metadataSummary.capturedAt += 1

      if (manifestOnly || metadataOnly) {
        const metadata = await sharp(inputPath, trustedImageOptions).metadata()
        const shouldSwapDimensions =
          metadata.orientation >= 5 && metadata.orientation <= 8
        const width = shouldSwapDimensions ? metadata.height : metadata.width
        const height = shouldSwapDimensions ? metadata.width : metadata.height

        if (width && height) {
          photoManifest[manifestKey] = {
            ...manifestEntry,
            width,
            height,
          }
        }
        continue
      }

      // FULL SIZE → webp
      const fullBuffer = await sharp(inputPath, trustedImageOptions)
        .rotate()
        .resize({
          height: 900,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .webp({ quality: 100, effort: 6 })
        .toBuffer()

      await uploadToR2(`${baseDir}/${imageHash}.webp`, fullBuffer, 'image/webp')

      // PREVIEW → jpeg
      const previewResult = await sharp(inputPath, trustedImageOptions)
        .rotate()
        .resize({
          width: 610,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toBuffer({ resolveWithObject: true })

      const previewBuffer = previewResult.data
      photoManifest[manifestKey] = {
        ...manifestEntry,
        width: previewResult.info.width,
        height: previewResult.info.height,
      }

      await uploadToR2(
        `${baseDir}/${imageHash}-preview${extension.toLowerCase()}`,
        previewBuffer,
        'image/jpeg',
      )

      console.log(
        `[${baseDir}] Processed ${file} → ${imageHash}.webp & ${imageHash}-preview${extension}`,
      )
    }
  }

  const sortedManifest = Object.fromEntries(
    Object.entries(photoManifest).sort(([a], [b]) => a.localeCompare(b)),
  )
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, `${JSON.stringify(sortedManifest, null, 2)}\n`)
  console.log(`🧭 Wrote photo dimensions and metadata to ${manifestPath}`)
  console.log(
    `📷 Metadata: ${metadataSummary.camera}/${metadataSummary.photos} cameras, ` +
      `${metadataSummary.lens}/${metadataSummary.photos} lenses, ` +
      `${metadataSummary.gps}/${metadataSummary.photos} GPS positions, ` +
      `${metadataSummary.capturedAt}/${metadataSummary.photos} capture dates`,
  )

  console.log(
    metadataOnly
      ? '🎉 Photo metadata extracted!'
      : manifestOnly
        ? '🎉 Photo manifest generated!'
        : '🎉 All images processed and uploaded to R2!',
  )
})()
