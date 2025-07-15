import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['selector'],
  content: ['./src/**/*.{astro,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      typography: {
        flexoki: {
          css: {
            '--tw-prose-body': 'oklch(var(--flexoki-tx))',
            '--tw-prose-headings': 'oklch(var(--flexoki-tx))',
            '--tw-prose-lead': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-links': 'oklch(var(--flexoki-tx))',
            '--tw-prose-bold': 'oklch(var(--flexoki-tx))',
            '--tw-prose-counters': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-bullets': 'oklch(var(--flexoki-tx-3))',
            '--tw-prose-hr': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-quotes': 'oklch(var(--flexoki-tx))',
            '--tw-prose-quote-borders': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-captions': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-code': 'oklch(var(--flexoki-tx))',
            '--tw-prose-pre-code': 'oklch(var(--flexoki-tx))',
            '--tw-prose-pre-bg': 'oklch(var(--flexoki-ui))',
            '--tw-prose-th-borders': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-td-borders': 'oklch(var(--flexoki-ui-2))',

            // Dark mode overrides
            '--tw-prose-invert-body': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-headings': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-lead': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-invert-links': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-bold': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-counters': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-invert-bullets': 'oklch(var(--flexoki-tx-3))',
            '--tw-prose-invert-hr': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-invert-quotes': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-quote-borders': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-invert-captions': 'oklch(var(--flexoki-tx-2))',
            '--tw-prose-invert-code': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-pre-code': 'oklch(var(--flexoki-tx))',
            '--tw-prose-invert-pre-bg': 'oklch(var(--flexoki-ui))',
            '--tw-prose-invert-th-borders': 'oklch(var(--flexoki-ui-2))',
            '--tw-prose-invert-td-borders': 'oklch(var(--flexoki-ui-2))',
          },
        },
      },
      fontFamily: {
        sans: ['Geist', ...defaultTheme.fontFamily.sans],
        mono: ['Geist Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
          foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-foreground) / <alpha-value>)',
        },
        additive: {
          DEFAULT: 'oklch(var(--additive) / <alpha-value>)',
          foreground: 'oklch(var(--additive-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
          foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'oklch(var(--border) / <alpha-value>)',
        ring: 'oklch(var(--ring) / <alpha-value>)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        waveBounce: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        fade: 'fadeIn 0.3s ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
}

export default config
