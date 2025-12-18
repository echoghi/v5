export const prerender = false
import type { APIRoute } from 'astro'
import dotenv from 'dotenv'

dotenv.config()

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path')

  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing ?path=...' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { DOMAIN, ANALYTICS_URL, PLAUSIBLE_KEY } = process.env

  if (!ANALYTICS_URL || !PLAUSIBLE_KEY || !DOMAIN) {
    return new Response(
      JSON.stringify({
        error: 'Missing ANALYTICS_URL or PLAUSIBLE_KEY or DOMAIN',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const base = ANALYTICS_URL.replace(/\/$/, '')
  const endpoint = `${base}/api/v2/query`

  const query = {
    site_id: DOMAIN,
    metrics: ['pageviews'],
    date_range: 'all',
    filters: [['is', 'event:page', [path]]],
    dimensions: [],
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PLAUSIBLE_KEY}`,
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
