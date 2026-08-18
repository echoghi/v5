export type Link = {
  href: string
  label: string
}

export const SITE = {
  TITLE: 'Emile Choghi',
  DESCRIPTION:
    'Emile Choghi is a software engineer who specializes in building useful digital experiences.',
  NUM_POSTS_ON_HOMEPAGE: 3,
  POSTS_PER_PAGE: 3,
} as const

export const NAV_LINKS: Link[] = [
  { href: '/', label: 'home' },
  { href: '/photos', label: 'photos' },
]

export const SOCIAL_LINKS: Link[] = [
  { href: 'https://github.com/echoghi', label: 'GitHub' },
  { href: 'echoghi@rennalabs.xyz', label: 'Email' },
  { href: '/rss.xml', label: 'RSS' },
]
