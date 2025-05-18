const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')

const repoRoot = path.join(__dirname, '..')
// Path to the photos directory containing all the folders to process
const photosDir = path.join(repoRoot, 'src/content/photos')
// New path for public images
const publicImagesDir = path.join(repoRoot, 'public/images')

// Create public/images directory if it doesn't exist
if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true })
}

// Get all directories within the photos directory
const baseDirs = fs
  .readdirSync(photosDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)

console.log(`Found directories to process: ${baseDirs.join(', ')}`)

// Configure Sharp for best quality
sharp.cache(false) // Disable caching for maximum quality processing

// Function to generate a random hash
function generateRandomHash() {
  return crypto.randomBytes(8).toString('hex')
}

// Process each directory
baseDirs.forEach((baseDir) => {
  // Path to the source images directory
  const inputDir = path.join(repoRoot, 'src/assets/images', `${baseDir}-source`)

  // Skip if source directory doesn't exist
  if (!fs.existsSync(inputDir)) {
    console.log(`Skipping ${baseDir} - source directory not found: ${inputDir}`)
    return
  }

  // Create output directory if it doesn't exist
  const outputDir = path.join(repoRoot, 'src/assets/images', baseDir)
  const publicOutputDir = path.join(publicImagesDir, baseDir)

  // Clear the normal output directory if it exists
  if (fs.existsSync(outputDir)) {
    console.log(`Clearing existing output directory: ${outputDir}`)
    fs.readdirSync(outputDir).forEach((file) => {
      const filePath = path.join(outputDir, file)
      fs.unlinkSync(filePath)
    })
  } else {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Clear the public output directory if it exists
  if (fs.existsSync(publicOutputDir)) {
    console.log(`Clearing existing public output directory: ${publicOutputDir}`)
    fs.readdirSync(publicOutputDir).forEach((file) => {
      const filePath = path.join(publicOutputDir, file)
      fs.unlinkSync(filePath)
    })
  } else {
    fs.mkdirSync(publicOutputDir, { recursive: true })
  }

  console.log(`Processing directory: ${baseDir}`)

  // Get all files from the input directory
  fs.readdir(inputDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${baseDir}:`, err)
      return
    }

    // Process each file
    let processedCount = 0
    const totalFiles = files.filter(
      (file) =>
        file !== '.DS_Store' && file.match(/\.(jpg|jpeg|JPG|JPEG|png|PNG)$/i),
    ).length

    if (totalFiles === 0) {
      console.log(`No JPEG images found in ${baseDir}`)
      return
    }

    // Keep track of generated hashes to avoid duplicates
    const generatedHashes = new Set()

    files.forEach((file) => {
      const inputPath = path.join(inputDir, file)

      // Skip non-image files and .DS_Store
      if (
        file === '.DS_Store' ||
        !file.match(/\.(jpg|jpeg|JPG|JPEG|png|PNG)$/i)
      ) {
        console.log(`Skipping ${file} - not a JPEG or PNG image`)
        return
      }

      // Get file extension while preserving case
      const extension = path.extname(file)

      // Generate unique hash for filename
      let randomHash
      do {
        randomHash = generateRandomHash()
      } while (generatedHashes.has(randomHash))

      // Add hash to tracking set
      generatedHashes.add(randomHash)

      const fullSizeOutputPath = path.join(
        publicOutputDir,
        `${randomHash}.webp`,
      )
      const previewOutputPath = path.join(
        outputDir,
        `${randomHash}-preview${extension}`,
      )

      // Process full-size version (highest quality)
      const fullSizePromise = sharp(inputPath, { failOnError: false })
        .rotate() // Auto-rotate based on EXIF orientation
        .resize({
          height: 900,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .webp({
          quality: 100,
          effort: 6,
        })
        .toFile(fullSizeOutputPath)

      // Process preview version (smaller size, lower quality)
      const previewPromise = sharp(inputPath, { failOnError: false })
        .rotate()
        .resize({
          width: 610,
          fit: sharp.fit.contain,
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .jpeg({
          quality: 80,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(previewOutputPath)

      // Wait for both versions to be processed
      Promise.all([fullSizePromise, previewPromise])
        .then(() => {
          processedCount++
          console.log(
            `[${baseDir}] Processed ${file} to ${randomHash}.webp (full) and ${randomHash}-preview${extension} (preview) (${processedCount}/${totalFiles})`,
          )
        })
        .catch((err) => {
          console.error(`[${baseDir}] Error processing ${file}:`, err)
        })
    })
  })
})

console.log('Processing all image directories...')
