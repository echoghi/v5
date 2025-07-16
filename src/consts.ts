export type Site = {
  TITLE: string
  DESCRIPTION: string
  EMAIL: string
  NUM_POSTS_ON_HOMEPAGE: number
  POSTS_PER_PAGE: number
  SITEURL: string
}

export type Link = {
  href: string
  label: string
}

export type Song = {
  title: string
  artist: string
  src: string
  maxHeight?: number
}

export const SITE: Site = {
  TITLE: 'Emile Choghi',
  DESCRIPTION:
    'Emile Choghi is a software engineer who specializes in building useful digital experiences.',
  EMAIL: 'echoghi@rennalabs.xyz',
  NUM_POSTS_ON_HOMEPAGE: 3,
  POSTS_PER_PAGE: 3,
  SITEURL: 'https://emile.sh',
}

export const NAV_LINKS: Link[] = [
  { href: '/', label: 'home' },
  { href: '/blog', label: 'blog' },
  { href: '/work', label: 'work' },
  { href: '/photos', label: 'photos' },
]

export const SOCIAL_LINKS: Link[] = [
  { href: 'https://github.com/echoghi', label: 'GitHub' },
  { href: 'echoghi@rennalabs.xyz', label: 'Email' },
  { href: '/rss.xml', label: 'RSS' },
]

export const songs: Record<string, Song[]> = {
  'palo-alto': [
    {
      title: 'Idol',
      artist: 'Mind Enterprises',
      src: '/mind-enterprises-idol.mp3',
    },
    {
      title: 'Polaris',
      artist: 'Cyber People',
      src: '/cyber-people-polaris.mp3',
    },
    {
      title: 'Balance Ton Quoi',
      artist: 'Angèle',
      src: '/angele-balance-ton-quoi.mp3',
    },
    {
      title: 'Lost',
      artist: 'Frank Ocean',
      src: '/frank-ocean-lost.mp3',
    },
    {
      title: 'Something in the Orange',
      artist: 'Zach Bryan',
      src: '/zach-bryan-something-in-the-orange.mp3',
    },
  ],
  italy: [
    {
      title: 'Mystery of Love',
      artist: 'Sufjan Stevens',
      src: '/sufjan-stevens-mystery-of-love.mp3',
      maxHeight: 60,
    },
    {
      title: 'Always Forever',
      artist: 'Cults',
      src: '/cults-always-forever.mp3',
    },
    {
      title: 'Clarinet Concerto in A Major (Adagio)',
      artist: 'Mozart',
      src: '/mozart-clarinet-concerto-adagio.mp3',
      maxHeight: 64,
    },
    {
      title: 'Amore mio aiutami',
      artist: 'Piero Piccioni',
      src: '/piero-piccioni-amore-mio-aiutami.mp3',
      maxHeight: 48,
    },
  ],
  'san-francisco': [
    {
      title: 'Rose Quartz',
      artist: 'Toro y Moi',
      src: '/toro-y-moi-rose-quartz.mp3',
      maxHeight: 48,
    },
    {
      title: 'Comedown',
      artist: 'Parcels',
      src: '/parcels-comedown.mp3',
      maxHeight: 48,
    },
    {
      title: 'Night Time',
      artist: 'Superorganism',
      src: '/superorganism-night-time.mp3',
    },
    {
      title: "So We Won't Forget",
      artist: 'Khruangbin',
      src: '/khruangbin-so-we-wont-forget.mp3',
      maxHeight: 40,
    },
    {
      title: 'Sofia',
      artist: 'Clairo',
      src: '/clairo-sofia.mp3',
      maxHeight: 40,
    },
    {
      title: 'Dreaming',
      artist: 'Blondie',
      src: '/blondie-dreaming.mp3',
      maxHeight: 40,
    },
    {
      title: 'Ordinary Pleasure',
      artist: 'Toro y Moi',
      src: '/toro-y-moi-ordinary-pleasure.mp3',
    },
  ],
}

export const songCharacterLimit = 20
