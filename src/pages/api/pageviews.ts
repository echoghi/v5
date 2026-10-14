export const prerender = false
import type { APIRoute } from 'astro'
import { pageviewAnalyticsConfig } from '@/lib/server-config'

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path')

  if (!path || !path.startsWith('/') || path.length > 200) {
    return new Response(JSON.stringify({ error: 'Missing ?path=...' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!pageviewAnalyticsConfig) {
    return new Response(
      JSON.stringify({ error: 'Pageview analytics are not configured' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const endpoint = `${pageviewAnalyticsConfig.apiHost}/api/v2/query`

  const query = {
    site_id: pageviewAnalyticsConfig.domain,
    metrics: ['pageviews'],
    date_range: 'all',
    filters: [['is', 'event:page', [path]]],
    dimensions: [],
  }

  let data
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pageviewAnalyticsConfig.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(query),
    })

    if (!resp.ok) {
      console.error(
        `Plausible request failed (${resp.status}):`,
        (await resp.text().catch(() => '')).slice(0, 500),
      )
      throw new Error(`Plausible responded with ${resp.status}`)
    }

    data = await resp.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Plausible request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pageviews = data?.results?.[0]?.metrics?.[0] ?? 0

  return new Response(JSON.stringify({ path, pageviews }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // s-maxage lets Vercel's CDN answer repeat requests, so the Plausible
      // key isn't spent on every view.
      'Cache-Control':
        'public, max-age=60, s-maxage=600, stale-while-revalidate=3600',
    },
  })
}
