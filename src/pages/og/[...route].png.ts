import { getNotes, getNoteTitle, getPosts } from '@/lib/content'
import { renderOgImage } from '@/lib/og'
import { formatDate } from '@/lib/utils'
import type { APIRoute, GetStaticPaths } from 'astro'
import { getEntry } from 'astro:content'

type Props = {
  section?: string
  title: string
  description?: string
}

// Link-preview cards for pages without a cover image of their own.
export const getStaticPaths = (async () => {
  const [posts, notes, now] = await Promise.all([
    getPosts(),
    getNotes(),
    getEntry('now', 'index'),
  ])
  const tags = [...new Set(posts.flatMap((post) => post.data.tags ?? []))]

  const pages: { route: string; props: Props }[] = [
    {
      route: 'home',
      props: {
        title: 'Emile Choghi',
        description: 'Writing, photos, and small web experiments.',
      },
    },
    {
      route: 'posts',
      props: {
        section: 'posts',
        title: 'Posts',
        description: 'Thoughts on software, life, and whatever else drifts by.',
      },
    },
    {
      route: 'notes',
      props: {
        section: 'notes',
        title: 'Notes',
        description: 'Short thoughts, links, and snippets.',
      },
    },
    {
      route: 'tags',
      props: { section: 'tags', title: 'Tags' },
    },
    ...tags.map((tag) => {
      const count = posts.filter((post) => post.data.tags?.includes(tag)).length
      return {
        route: `tags/${tag}`,
        props: {
          section: 'tags',
          title: `#${tag}`,
          description: `${count} ${count === 1 ? 'post' : 'posts'}`,
        },
      }
    }),
    ...notes.map((note) => ({
      route: `notes/${note.id}`,
      props: {
        section: `note · ${formatDate(note.data.date)}`,
        title: getNoteTitle(note),
      },
    })),
    ...posts
      .filter((post) => !post.data.image)
      .map((post) => ({
        route: `posts/${post.id}`,
        props: {
          section: 'posts',
          title: post.data.title,
          description: post.data.description,
        },
      })),
  ]

  if (now) {
    pages.push({
      route: 'now',
      props: {
        section: 'now',
        title: 'What I’m doing now',
        description: now.data.summary,
      },
    })
  }

  return pages.map(({ route, props }) => ({ params: { route }, props }))
}) satisfies GetStaticPaths

export const GET: APIRoute<Props> = async ({ props, site, url }) => {
  const host = (site ?? url).hostname
  const png = await renderOgImage({
    eyebrow: props.section ? `${host} / ${props.section}` : host,
    title: props.title,
    description: props.description,
  })

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  })
}
