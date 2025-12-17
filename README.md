![Showcase Card](/public/static/twitter-card.png)

## emile.sh

My personal corner of the web.

### Features

- **Photo galleries hosted on Cloudflare R2**
  Optimized, globally distributed image galleries with fast load times and efficient storage.

- **Gallery music player**
  Each photo gallery can have its own soundtrack, creating a more immersive and personalized experience. Includes an audio waveform visualizer and album cover art in the form of a spinning CD.

- **Blog**
  A writing space for long-form posts, notes, and ideas.

- **Work showcase**
  Dedicated sections to highlight projects, experiments, and professional work.

### Tech Stack

- **Astro**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **MDX / Markdown**
- **Cloudflare R2** – Object storage for photos and audio
- **AWS SDK (S3-compatible)** – Uploading and managing R2 assets
- **Plausible Analytics** – Lightweight, privacy-focused analytics

---

## Prerequisites

Before adding photo galleries or running the image processing scripts, you must configure Cloudflare R2 and your public media endpoint.

### Cloudflare Setup

- Create a **Cloudflare account** (free)
- Enable **R2 Object Storage** (free tier available)
- Create an **R2 bucket** for gallery assets
- Generate **R2 access keys** with read/write permissions for that bucket
- (Optional but recommended) Configure a **custom domain** for R2 (CDN-style), e.g. `https://cdn.yoursite.com`

### Required Environment Variables

The image processing script loads credentials via `dotenv` and requires the following environment variables:

```env
ACCOUNT_ID=your_cloudflare_account_id
BUCKET=your_r2_bucket_name
AWS_ACCESS_KEY_ID=your_r2_access_key_id
AWS_SECRET_ACCESS_KEY=your_r2_secret_access_key
```

#### Variable descriptions

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

> **Note:** The R2 API endpoint is derived automatically from `ACCOUNT_ID` inside the image processing script and does not need to be set manually.

### CDN / Media Endpoint Configuration

Gallery images and audio are served from a **public endpoint** backed by Cloudflare R2.
This endpoint can be **custom-named** using a Cloudflare-managed domain.

Example:

```
https://cdn.emile.sh
```

#### Required code changes

1. **Update the media endpoint used at runtime**

Open:

```
src/lib/utils.ts
```

Update the endpoint reference inside the function:

```
getSongDataById
```

This function constructs public URLs for:

- Audio files
- Waveform JSON data
- Album artwork

Replace the existing base URL with your own CDN / R2 public endpoint.

2. **Configure site-specific constants**

Update your site metadata in:

```
src/consts.ts
```

This includes project-specific values such as:

- Site name
- Base URLs
- Any other global constants used across the site

> **Important:** If the CDN endpoint is not configured correctly, music playback and gallery media will fail to load even if uploads succeed.

---

## Adding Photo Galleries

### 1) Add raw images (gitignored)

- Place raw images (`.jpg`, `.png`, or `.webp`) in a top-level folder called **`photos/`** (this folder is gitignored).
- For each gallery, create a source folder named:

```
photos/<album-slug>-source/
```

Example:

```
photos/san-francisco-source/
  IMG_001.jpg
  IMG_002.png
```

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

This image is used for gallery cards and previews.

---

### 4) Process and upload images

Run:

```bash
npm run process-images
```

#### What this does

- **Clears existing gallery images from Cloudflare R2**, while preserving anything under `albums/`

- **Scans all gallery folders** in `src/content/photos/`

- For each gallery:
  - Reads raw images from `photos/<album-slug>-source/`
  - Generates a **unique hash-based filename** per image
  - Creates and uploads:
    - A **full-size WebP** (max height 900px)
    - A **preview JPEG** (≈610px wide)

- Uploads everything to Cloudflare R2 under:

  ```
  <album-slug>/<hash>.webp
  <album-slug>/<hash>-preview.jpg
  ```

Once complete, all gallery images are optimized, uploaded, and ready to be served globally from R2.

---

## Adding Music to a Gallery (Optional)

Galleries can optionally include a custom music player.
If **no music is provided**, the player will **not render**.

**Notes**

- The music player only appears on **desktop breakpoints and larger**
- Playback can be toggled using the spacebar
- The player starts minimized, expands when you press play, and can be minimized again without stopping playback
- Music is associated with a gallery via its **slug**
- Waveform height tweaks are optional; defaults are usually fine

### 1) Register songs for a gallery

Add song metadata to `src/consts.ts`.

- The key must match the **gallery slug**
- Each entry represents one track in the gallery playlist

#### Song fields

- `title` — Track title
- `artist` — Artist name
- `id` — **Slug used for filenames** (must match audio + artwork)
- `maxHeight` _(optional)_ — Controls the relative height of the animated waveform bars

### 2) Add MP3 files

Place MP3 files in:

```
public/audio/<gallery-slug>/
```

Filenames **must match** the song `id`.

### 3) Generate waveform data

Run:

```bash
npm run process-audio
```

Or for a single gallery:

```bash
npm run process-audio -- --dir san-francisco
```

### 4) Add album artwork

For each song, add a square album image:

- **Format:** WebP
- **Size:** 100 × 100
- **Filename:** Must match the song `id`

Album artwork must be **uploaded to Cloudflare R2** under a top-level folder named **`albums/`**.

Example structure in R2:

```
albums/
  parcels-comedown.webp
  toro-y-moi-rose-quartz.webp
```

> **Note:** The `albums/` directory is intentionally preserved by the image upload script and will not be deleted during gallery updates.

---

## License

This project is open source and available under the [MIT License](LICENSE).
