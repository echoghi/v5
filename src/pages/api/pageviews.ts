export const prerender = false
import type { APIRoute } from 'astro'
import { pageviewAnalyticsConfig } from '@/lib/server-config'

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path')

  if (!path) {
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
    const text = await resp.text().catch(() => '')
    return new Response(
      JSON.stringify({
        error: 'Plausible request failed',
        status: resp.status,
        body: text.slice(0, 500),
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const data = await resp.json()

  const pageviews = data?.results[0].metrics[0] ?? 0

  return new Response(JSON.stringify({ path, pageviews }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
