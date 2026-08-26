![emile.sh](public/static/twitter-card.png)

# emile.sh

The source for [emile.sh](https://emile.sh), a personal site built around a continuous photostream, writing, and small web experiments.

### Features

- **Fullscreen photostream hosted on Cloudflare R2**
  Every archive is mixed into one edge-to-edge masonry stream with aspect-ratio placeholders and FLIP + WAAPI photo transitions.

- **Photostream music player**
  One combined playlist floats over the stream. The player includes a live five-band Web Audio spectrum and a slowly spinning album cover.

- **Posts**
  A writing space for long-form posts, notes, and ideas.

### Tech Stack

- **Astro**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **MDX / Markdown**
- **Web Audio API** – Live bass-to-treble spectrum analysis
- **Cloudflare R2** – Object storage for gallery images and album artwork
- **AWS SDK (S3-compatible)** – Uploading and managing R2 assets
- **Plausible Analytics** – Lightweight, privacy-focused analytics

---

## Local Development

Install the dependencies and copy the example environment file:

```bash
npm install
cp .env.example .env
```

Set `DOMAIN` to your deployment hostname, then start Astro:

```bash
npm run dev
```

The development server runs at `http://localhost:1234`. To type-check and create a production build, run:

```bash
npm run build
```

R2 and Plausible are optional during local development. Without R2, galleries are empty and music uses the local logo in place of album artwork. Without Plausible, tracking and pageview counts are not rendered.

---

## Prerequisites

Cloudflare R2 is required to serve gallery images and album artwork, and to run the image-processing workflow. It is not required to run the rest of the site. MP3 files are stored in `public/audio` and are served as static site assets.

### Cloudflare Setup

- Create a **Cloudflare account** (free)
- Enable **R2 Object Storage** (free tier available)
- Create an **R2 bucket** for gallery assets
- Generate **R2 access keys** with read/write permissions for that bucket
- (Optional but recommended) Configure a **custom domain** for R2 (CDN-style), e.g. `https://cdn.yoursite.com`

### Environment Variables

Astro validates the site configuration through its typed environment schema. The standalone image-processing script reads the same R2 values from `.env` using `dotenv`.

```env
DOMAIN=yoursite.com
R2_PUBLIC_DOMAIN=cdn.yoursite.com
ACCOUNT_ID=your_cloudflare_account_id
BUCKET=your_r2_bucket_name
AWS_ACCESS_KEY_ID=your_r2_access_key_id
AWS_SECRET_ACCESS_KEY=your_r2_secret_access_key

# Optional analytics
ANALYTICS_URL=https://plausible.io
PLAUSIBLE_KEY=your_plausible_stats_api_key
```

#### Variable descriptions

- **`DOMAIN`**
  The production hostname, without a protocol. Astro uses it for canonical URLs, the sitemap, RSS, and Plausible's site ID.

- **`R2_PUBLIC_DOMAIN`**
  The public R2 or CDN hostname used to construct gallery image URLs, without a protocol.

- **`ANALYTICS_URL`**
  Optional. The Plausible server URL. Use `https://plausible.io` for the hosted service or the URL of your self-hosted instance. Leave it blank to disable analytics entirely.

- **`PLAUSIBLE_KEY`**
  Optional. A Plausible Stats API key used by `/api/pageviews`. When it is absent, event tracking can still work, but public pageview counts are not rendered.

- **`ACCOUNT_ID`**
  Your Cloudflare account ID.
  Used to construct the R2 S3-compatible endpoint:

  ```
  https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  ```

- **`BUCKET`**
  The name of the Cloudflare R2 bucket where processed gallery images are uploaded.

- **`AWS_ACCESS_KEY_ID`**
  The access key generated for your R2 API token.
  Used by the AWS SDK to authenticate requests.

- **`AWS_SECRET_ACCESS_KEY`**
  The secret key paired with the access key above.
  Required for authenticated read/write access.

> **Note:** The R2 API endpoint is derived automatically from `ACCOUNT_ID` and does not need to be set manually. The application skips R2 calls when any required R2 value is missing; the image-processing script instead exits immediately with a list of missing variables.

### CDN / Media Configuration

Gallery images and album artwork are served from a public endpoint backed by Cloudflare R2. MP3 files are served separately from `public/audio`.

The public R2 endpoint can use a Cloudflare-managed custom domain, for example:

```
https://cdn.yoursite.com
```

#### Required configuration

1. **Configure gallery images**

Set `R2_PUBLIC_DOMAIN` in `.env` to the public hostname without `https://`:

```env
R2_PUBLIC_DOMAIN=cdn.yoursite.com
```

2. **Configure album artwork**

Album artwork is loaded automatically from:

```text
https://<R2_PUBLIC_DOMAIN>/albums/<song-id>.webp
```

The same `R2_PUBLIC_DOMAIN` setting is used for gallery images and album artwork. No source-code change is required.

3. **Configure site-specific content**

Update your site metadata in:

```
src/site.config.ts
```

This includes project-specific values such as:

- Site name
- Description
- Navigation links
- Social links

Photo-gallery playlists remain in `src/consts.ts`. Deployment-specific values and secrets belong in `.env`; they do not need to be changed in source code.

> **Important:** An incorrect `R2_PUBLIC_DOMAIN` will prevent gallery images and album artwork from loading. MP3 playback uses local static assets.

---

## Adding Photo Galleries

### 1) Add raw images (gitignored)

- Place raw images (`.heic`, `.heif`, `.jpg`, `.png`, or `.webp`) in the
  gitignored top-level **`photos-google/`** folder.
- For each gallery, create a source folder named:

```
photos-google/<album-slug>-source/
```

Example:

```
photos-google/san-francisco-source/
  IMG_001.jpg
  IMG_002.png
```

The previous source tree remains available in the gitignored `photos/` folder.
To use it temporarily without changing code, prefix a photo command with
`PHOTO_SOURCE_DIR=photos`.

For a flat Google Photos download, keep the untouched ZIP in `photos-google/`,
extract it into `photos-google/export/`, then run:

```bash
npm run photos:organize
```

The organizer matches existing published photos visually and assigns additional
photos from their preserved filename, capture-time, and GPS metadata. HEIC files
are converted to metadata-preserving JPEG working copies; their originals stay
untouched in `photos-google/export/`.

### 2) Create the gallery content entry

For each album, add a folder in:

```
src/content/photos/<album-slug>/
```

Then create `index.md` inside it.

Example: `src/content/photos/san-francisco/index.md`

```md
---
name: 'San Francisco'
title: 'Life by the Marina & explorations of Marin'
description: 'I lived in the city for two years in a neighborhood called Cow Hollow.'
period: '2019-2021'
date: '2021-01-01'
image: '/src/assets/images/sf-preview.jpg'
---
```

### 3) Add a preview image

- Create a **600 × 338 (16:9)** preview image for the gallery.
- Save it locally and reference it in the frontmatter above, for example:

```
/src/assets/images/sf-preview.jpg
```

This image is retained as collection-level metadata for future social or admin previews; the public `/photos` stream uses the R2 preview objects directly.

---

### 4) Process and upload images

Run:

```bash
npm run process-images
```

To process only specific galleries, pass their slugs after `--`:

```bash
npm run process-images -- thailand vietnam
```

#### What this does

- **Clears existing gallery images from Cloudflare R2**, while preserving anything under `albums/`
  - When specific gallery slugs are provided, only those R2 prefixes are cleared

- **Scans all gallery folders** in `src/content/photos/`
  - When specific gallery slugs are provided, only those galleries are scanned

- For each gallery:
  - Reads raw images from `photos-google/<album-slug>-source/`
  - Generates a **stable hash-based filename** per image
  - Creates and uploads:
    - A **full-size WebP** (max height 900px)
    - A **preview JPEG** (≈610px wide)

- Updates `src/data/photo-manifest.json` with the source dimensions used to reserve the masonry layout before remote images load

- Uploads everything to Cloudflare R2 under:

  ```
  <album-slug>/<hash>.webp
  <album-slug>/<hash>-preview.jpg
  ```

Once complete, all gallery images are optimized, uploaded, and ready to be served globally from R2.

To rebuild only the local dimension manifest without changing R2, run:

```bash
npm run photos:manifest
```

To extract camera, lens, GPS, capture-time, and exposure metadata from the
gitignored source images without uploading or deleting anything in R2, run:

```bash
npm run photos:metadata
```

Metadata is stored alongside each image's hash in
`src/data/photo-manifest.json`. Existing manifest values are preserved so
manually entered camera and location overrides remain authoritative.

To turn embedded GPS coordinates into human-readable location labels, run:

```bash
npm run photos:locations
```

This downloads the generic GeoNames worldwide place-name dataset into the
gitignored photo source folder, then finds the nearest named place entirely on
this Mac. Photo coordinates are never sent to a third party. It fills only blank
locations and marks generated labels in the manifest so
`npm run photos:locations -- --refresh` can refresh them later; locations saved
through the review screen become manual overrides and are never overwritten.
Place-name data is provided by GeoNames under CC BY 4.0.

Because this repository is public, sanitize the manifest after deriving its
location labels and before committing it:

```bash
npm run photos:sanitize
```

This removes exact coordinates, timezone offsets, and time-of-day values while
preserving capture dates and the human-readable location, camera, lens,
exposure, and dimension metadata used by the site.

If the R2 bucket contains legacy image hashes, link those existing objects to
their local originals using perceptual fingerprints and copy the extracted
metadata into their manifest records:

```bash
npm run photos:sync-metadata
```

This command reads R2 previews but only writes the local manifest. It does not
upload, replace, or delete remote images.

For legacy R2 objects whose original hashes no longer match the local source hash, merge their preview dimensions into the manifest with the read-only command:

```bash
npm run photos:sync-manifest
```

---

## Adding Music to the Photostream (Optional)

Songs remain organized by gallery slug on disk, but every registered song is flattened into the single photostream playlist. If **no music is provided**, the player will **not render**.

**Notes**

- The player renders whenever the combined playlist has at least one track
- The compact overlay is available on mobile and desktop
- Browsers require the first playback to come from a user interaction
- Once activated, playback can also be toggled with the spacebar when focus is not inside a control or editable field
- The player starts minimized, expands when you press play, and can be minimized again without stopping playback
- The gallery **slug** still determines each MP3's folder
- Audio uses `preload="metadata"`; full tracks are not intentionally preloaded on page load

### How the spectrum works

The five bars are driven directly by an `AnalyserNode` connected to the playing `<audio>` element. A 2048-point FFT divides the signal into these bands:

| Bar | Frequency range | Approximate content     |
| --- | --------------- | ----------------------- |
| 1   | 20–120 Hz       | Sub-bass and bass       |
| 2   | 120–300 Hz      | Upper bass and low mids |
| 3   | 300–900 Hz      | Midrange                |
| 4   | 900–3,000 Hz    | Upper mids and presence |
| 5   | 3,000–12,000 Hz | Treble                  |

The bars update from the live frequency data while audio is playing. No waveform JSON, preprocessing step, or per-song height configuration is required.

### 1) Register songs

Add song metadata to `src/consts.ts`.

- The key must match the **gallery slug**
- Each entry represents one track in the combined photostream playlist

#### Song fields

- `title` — Track title
- `artist` — Artist name
- `id` — **Slug used for filenames** (must match audio + artwork)

Example:

```ts
export const songs: Record<string, Song[]> = {
  'san-francisco': [
    {
      title: 'Comedown',
      artist: 'Parcels',
      id: 'parcels-comedown',
    },
  ],
}
```

### 2) Add MP3 files

Place MP3 files in:

```
public/audio/<gallery-slug>/
```

Filenames **must match** the song `id`.

For the example above:

```text
public/audio/san-francisco/parcels-comedown.mp3
```

### 3) Add album artwork

For each song, add a square album image:

- **Format:** WebP
- **Size:** 100 × 100
- **Filename:** Matches `albumArtworkId` when present, otherwise the song `id`

Album artwork must be **uploaded to Cloudflare R2** under a top-level folder named **`albums/`**.

Example structure in R2:

```
albums/
  parcels-comedown.webp
  toro-y-moi-rose-quartz.webp
```

Set the same `albumArtworkId` on songs from the same album to reuse one image.
Audio filenames always use the song `id`; missing files will result in a
playback error or broken cover respectively.

> **Note:** The `albums/` directory is intentionally preserved by the image upload script and will not be deleted during gallery updates.

---

## License

This project is open source and available under the [MIT License](LICENSE).
