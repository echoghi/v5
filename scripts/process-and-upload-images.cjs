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

// ==== HELPERS ====
function generateRandomHash() {
  return crypto.randomBytes(8).toString('hex')
}

async function clearBucket() {
  console.log('🗑️  Clearing bucket before upload (excluding albums/)...')
  let continuationToken

  do {
    const listResp = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      }),
    )

    if (listResp.Contents && listResp.Contents.length > 0) {
      // ❌ exclude anything under albums/
      const objectsToDelete = listResp.Contents.filter(
        (obj) => obj.Key && !obj.Key.startsWith('albums/'),
      ).map((obj) => ({ Key: obj.Key }))

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

  console.log('✅ Bucket cleared (albums/ preserved)')
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
  // Clear bucket first
  await clearBucket()

  // Discover base directories
  const baseDirs = fs
    .readdirSync(photosDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  console.log(`Found directories: ${baseDirs.join(', ')}`)

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

    const generatedHashes = new Set()

    for (const file of files) {
      const inputPath = path.join(inputDir, file)
      const extension = path.extname(file)

      // unique random hash
      let randomHash
      do {
        randomHash = generateRandomHash()
      } while (generatedHashes.has(randomHash))
      generatedHashes.add(randomHash)

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
        `${baseDir}/${randomHash}.webp`,
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
        `${baseDir}/${randomHash}-preview${extension.toLowerCase()}`,
        previewBuffer,
        'image/jpeg',
      )

      console.log(
        `[${baseDir}] Processed ${file} → ${randomHash}.webp & ${randomHash}-preview${extension}`,
      )
    }
  }

  console.log('🎉 All images processed and uploaded to R2!')
})()
