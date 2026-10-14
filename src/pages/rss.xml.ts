import mdxRenderer from '@astrojs/mdx/server.js'
import reactRenderer from '@astrojs/react/server.js'
import rss from '@astrojs/rss'
import { getNoteTitle, getNotes, getPosts } from '@/lib/content'
import { SITE } from '@/site.config'
import type { APIContext } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { type CollectionEntry, render } from 'astro:content'

// Feed readers resolve URLs against the feed, not the page, and don't run
// scripts, so make links absolute and drop the code-block copy buttons.
function toFeedHtml(html: string, origin: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<button\b[\s\S]*?<\/button>/g, '')
    .replace(/(src|href|poster)="\/(?!\/)/g, `$1="${origin}/`)
    .replace(
      /srcset="([^"]*)"/g,
      (_, srcset: string) =>
        `srcset="${srcset.replace(/(^|,\s*)\/(?!\/)/g, `$1${origin}/`)}"`,
    )
}

export async function GET(context: APIContext) {
  const site = context.site ?? context.url
  // Imported statically rather than through loadRenderers() so Vite resolves
  // the React renderer's virtual config module at build time.
  const container = await AstroContainer.create()
  container.addServerRenderer({ name: 'astro:jsx', renderer: mdxRenderer })
  container.addServerRenderer({
    name: '@astrojs/react',
    renderer: reactRenderer,
  })
  const renderEntry = async (
    entry: CollectionEntry<'blog'> | CollectionEntry<'notes'>,
  ) => {
    const { Content } = await render(entry)
    return toFeedHtml(await container.renderToString(Content), site.origin)
  }

  const [posts, notes] = await Promise.all([getPosts(), getNotes()])
  const items = await Promise.all([
    ...posts.map(async (post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
      content: await renderEntry(post),
    })),
    ...notes.map(async (note) => ({
      title: getNoteTitle(note),
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
      content: await renderEntry(note),
    })),
  ])

  return rss({
    title: SITE.TITLE,
    description: SITE.DESCRIPTION,
    site,
    items: items.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()),
  })
}
