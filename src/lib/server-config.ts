import {
  ACCOUNT_ID,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  BUCKET,
  PLAUSIBLE_KEY,
  R2_PUBLIC_DOMAIN,
} from 'astro:env/server'
import { analyticsConfig } from '@/lib/analytics-config'

function normalizeOrigin(value: string | undefined) {
  if (!value) return null

  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin
  } catch {
    return null
  }
}

const mediaOrigin = normalizeOrigin(R2_PUBLIC_DOMAIN)

export function getPublicMediaUrl(...segments: string[]) {
  if (!mediaOrigin) return null

  const path = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')

  return new URL(path, `${mediaOrigin}/`).toString()
}

export function getR2Config() {
  if (!ACCOUNT_ID || !BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return null
  }

  return {
    bucket: BUCKET,
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  }
}

export const pageviewAnalyticsConfig =
  analyticsConfig && PLAUSIBLE_KEY
    ? { ...analyticsConfig, apiKey: PLAUSIBLE_KEY }
    : null
