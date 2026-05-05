const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3')

require('dotenv').config()

// ==== CONFIGURATION ====
const ACCOUNT_ID = process.env.ACCOUNT_ID
const BUCKET = process.env.BUCKET
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`

const r2 = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// ==== PATHS ====
const repoRoot = process.cwd()
const photosDir = path.join(repoRoot, 'src/content/photos')
const requestedBaseDirs = process.argv.slice(2)

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

async function clearBucket(baseDirsToClear) {
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

  console.log(`Found directories: ${baseDirs.join(', ')}`)

  // Clear bucket or selected prefixes first
  await clearBucket(requestedBaseDirs)

  sharp.cache(false)

  for (const baseDir of baseDirs) {
    const inputDir = path.join(repoRoot, 'photos', `${baseDir}-source`)

    if (!fs.existsSync(inputDir)) {
      console.log(`Skipping ${baseDir} (no source dir: ${inputDir})`)
      continue
    }

    console.log(`Processing directory: ${baseDir}`)

    const files = fs
      .readdirSync(inputDir)
      .filter(
        (f) => f !== '.DS_Store' && f.match(/\.(jpg|jpeg|JPG|JPEG|png|PNG)$/i),
      )

    if (files.length === 0) {
      console.log(`No images in ${baseDir}`)
      continue
    }

    for (const file of files) {
      const inputPath = path.join(inputDir, file)
      const extension = path.extname(file)
      const imageHash = generateImageHash(baseDir, file, inputPath)

      // FULL SIZE → webp
      const fullBuffer = await sharp(inputPath, { failOnError: false })
        .rotate()
        .resize({
          height: 900,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .webp({ quality: 100, effort: 6 })
        .toBuffer()

      await uploadToR2(
        `${baseDir}/${imageHash}.webp`,
        fullBuffer,
        'image/webp',
      )

      // PREVIEW → jpeg
      const previewBuffer = await sharp(inputPath, { failOnError: false })
        .rotate()
        .resize({
          width: 610,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toBuffer()

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

  console.log('🎉 All images processed and uploaded to R2!')
})()
