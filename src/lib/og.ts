import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import satori from 'satori'
import sharp from 'sharp'

type OgImageOptions = {
  eyebrow: string
  title: string
  description?: string
}

const require = createRequire(import.meta.url)

// Satori can't read WOFF2, so these come from the static WOFF builds.
const fonts = Promise.all([
  readFile(
    require.resolve('@fontsource/figtree/files/figtree-latin-400-normal.woff'),
  ),
  readFile(
    require.resolve('@fontsource/figtree/files/figtree-latin-600-normal.woff'),
  ),
  readFile(
    require.resolve('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff'),
  ),
]).then(([figtree, figtreeSemibold, instrumentSerif]) => [
  { name: 'Figtree', data: figtree, weight: 400 as const },
  { name: 'Figtree', data: figtreeSemibold, weight: 600 as const },
  { name: 'Instrument Serif', data: instrumentSerif, weight: 400 as const },
])

// The hexagon mark from /static/twitter-card.png, redrawn as a vector.
const logo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="none" stroke="#cbcbc3" stroke-width="4"/><g fill="#cbcbc3"><rect x="38" y="33" width="8" height="34"/><rect x="38" y="33" width="24" height="7"/><rect x="38" y="46.5" width="22" height="7"/><rect x="38" y="60" width="24" height="7"/></g></svg>',
)}`

const colors = {
  background: '#101010',
  foreground: '#cecdc3',
  muted: '#878580',
}

type Node = {
  type: string
  props: Record<string, unknown> & { children?: Node | Node[] | string }
}

const h = (
  type: string,
  style: Record<string, unknown>,
  children?: Node | Node[] | string,
  props: Record<string, unknown> = {},
): Node => ({ type, props: { ...props, style, children } })

export async function renderOgImage({
  eyebrow,
  title,
  description,
}: OgImageOptions) {
  const svg = await satori(
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        // Satori defaults to content-box, which pushes the padding off-canvas.
        boxSizing: 'border-box',
        padding: '72px 80px',
        background: colors.background,
        color: colors.foreground,
        fontFamily: 'Figtree',
      },
      [
        h('div', { display: 'flex', alignItems: 'center', gap: 20 }, [
          h('img', { width: 64, height: 64 }, undefined, { src: logo }),
          h(
            'div',
            { fontSize: 28, color: colors.muted, letterSpacing: '0.01em' },
            eyebrow,
          ),
        ]),
        h('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
          h(
            'div',
            {
              fontSize: title.length > 40 ? 64 : 76,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              maxWidth: 1000,
            },
            title,
          ),
          ...(description
            ? [
                h(
                  'div',
                  {
                    fontFamily: 'Instrument Serif',
                    fontSize: 38,
                    lineHeight: 1.25,
                    color: colors.muted,
                    maxWidth: 960,
                  },
                  description,
                ),
              ]
            : []),
        ]),
      ],
    ) as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts: await fonts },
  )

  return sharp(Buffer.from(svg)).png().toBuffer()
}
