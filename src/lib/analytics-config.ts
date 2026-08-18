import { ANALYTICS_URL, DOMAIN } from 'astro:env/client'

const apiHost = ANALYTICS_URL?.replace(/\/+$/, '')
const domain = DOMAIN
  ? new URL(DOMAIN.includes('://') ? DOMAIN : `https://${DOMAIN}`).hostname
  : undefined

export const analyticsConfig = domain && apiHost ? { domain, apiHost } : null
