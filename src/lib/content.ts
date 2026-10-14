import { type CollectionEntry, getCollection } from 'astro:content'

export type Post = CollectionEntry<'blog'>
export type Note = CollectionEntry<'notes'>

const newestFirst = (
  a: { data: { date: Date } },
  b: { data: { date: Date } },
) => b.data.date.valueOf() - a.data.date.valueOf()

export async function getPosts(): Promise<Post[]> {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    newestFirst,
  )
}

export async function getNotes(): Promise<Note[]> {
  return (await getCollection('notes', ({ data }) => !data.draft)).sort(
    newestFirst,
  )
}

// Posts ranked by how many tags they share with `post`, newest first on ties.
export function getRelatedPosts(post: Post, posts: Post[], limit = 3) {
  const tags = new Set(post.data.tags ?? [])

  return posts
    .filter((candidate) => candidate.id !== post.id)
    .map((candidate) => ({
      candidate,
      shared: (candidate.data.tags ?? []).filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort(
      (a, b) => b.shared - a.shared || newestFirst(a.candidate, b.candidate),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}

// Markdown to plain text, cut at a word boundary.
function excerpt(markdown: string, maxLength: number) {
  const plain = markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxLength) return plain
  const cut = plain.slice(0, maxLength - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`
}

export function getNoteTitle(note: Note) {
  return note.data.title ?? excerpt((note.body ?? '').split('\n\n')[0], 60)
}

export function getNoteDescription(note: Note) {
  return excerpt(note.body ?? '', 155)
}
