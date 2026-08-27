import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { transformerCopyButton } from '@rehype-pretty/transformers'
import {
  transformerMetaHighlight,
  transformerNotationDiff,
} from '@shikijs/transformers'
import { defineConfig, envField } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import rehypeExternalLinks from 'rehype-external-links'
import rehypePrettyCode from 'rehype-pretty-code'
import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import sectionize from '@hbsnow/rehype-sectionize'
import { loadEnv } from 'vite'

import vercel from '@astrojs/vercel'

const { DOMAIN } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
)
const site = DOMAIN
  ? new URL(DOMAIN.includes('://') ? DOMAIN : `https://${DOMAIN}`).origin
  : undefined

// https://astro.build/config
export default defineConfig({
  site,

  redirects: {
    '/blog': '/posts',
    '/blog/[...id]': '/posts/[...id]',
  },

  env: {
    schema: {
      DOMAIN: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      ANALYTICS_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        url: true,
      }),
      R2_PUBLIC_DOMAIN: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      ACCOUNT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      BUCKET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      AWS_ACCESS_KEY_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      AWS_SECRET_ACCESS_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      PLAUSIBLE_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },

  integrations: [sitemap(), mdx(), react()],

  trailingSlash: 'ignore',

  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noreferrer', 'noopener'],
        },
      ],
      rehypeHeadingIds,
      rehypeKatex,
      // @ts-expect-error Different unified versions expose incompatible plugin types.
      sectionize,
      [
        rehypePrettyCode,
        {
          theme: {
            light: 'github-light-high-contrast',
            dark: 'github-dark-high-contrast',
          },
          transformers: [
            transformerNotationDiff(),
            transformerMetaHighlight(),
            transformerCopyButton({
              visibility: 'hover',
              feedbackDuration: 1000,
            }),
          ],
        },
      ],
    ],
    remarkPlugins: [remarkToc, remarkMath, remarkEmoji],
  },

  server: {
    port: 1234,
    host: true,
  },

  vite: {
    optimizeDeps: {
      include: ['react-dom/client'],
    },
  },

  devToolbar: {
    enabled: false,
  },

  adapter: vercel(),
})
