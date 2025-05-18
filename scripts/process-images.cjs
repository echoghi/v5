const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')

// Set the directory to process (without the "-source" suffix)
const baseDir = 'palo-alto'

// Define source and destination paths
const repoRoot = path.join(__dirname, '..')

const inputDir = path.join(repoRoot, 'src/assets/images', `${baseDir}-source`)
const outputDir = path.join(repoRoot, 'src/assets/images', baseDir)
const publicOutputDir = path.join(repoRoot, 'public/images', baseDir)

// Ensure public/images/baseDir exists
if (!fs.existsSync(publicOutputDir)) {
  fs.mkdirSync(publicOutputDir, { recursive: true })
}

// Clear existing files in output directories
for (const dir of [outputDir, publicOutputDir]) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file) => fs.unlinkSync(path.join(dir, file)))
  } else {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Configure Sharp for best quality
sharp.cache(false)

// Random hash generator
function generateRandomHash() {
  return crypto.randomBytes(8).toString('hex')
}

// Read and process images
fs.readdir(inputDir, (err, files) => {
  if (err) {
    console.error(`Error reading directory ${inputDir}:`, err)
    return
  }

  const images = files.filter(
    (f) => f.match(/\.(jpe?g|png)$/i) && f !== '.DS_Store',
  )
  if (images.length === 0) {
    console.log(`No images found in ${inputDir}`)
    return
  }

  const generatedHashes = new Set()
  let processedCount = 0

  images.forEach((file) => {
    const inputPath = path.join(inputDir, file)
    const extension = path.extname(file)

    let hash
    do {
      hash = generateRandomHash()
    } while (generatedHashes.has(hash))
    generatedHashes.add(hash)

    const fullOutput = path.join(publicOutputDir, `${hash}.webp`)
    const previewOutput = path.join(outputDir, `${hash}-preview${extension}`)

    const fullSize = sharp(inputPath)
      .rotate()
      .resize({ height: 900, fit: 'contain', withoutEnlargement: true })
      .webp({ quality: 100, effort: 6 })
      .toFile(fullOutput)

    const preview = sharp(inputPath)
      .rotate()
      .resize({ width: 610, fit: 'contain', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toFile(previewOutput)

    Promise.all([fullSize, preview])
      .then(() => {
        processedCount++
        console.log(
          `Processed ${file} → ${hash}.webp & ${hash}-preview${extension} (${processedCount}/${images.length})`,
        )
      })
      .catch((err) => console.error(`Error processing ${file}:`, err))
  })
})
