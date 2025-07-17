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
  id: string
  maxHeight?: number
}

export interface SongData {
  title: string
  artist: string
  id: string
  maxHeight?: number
  waveform: number[]
  albumCover: string
  mp3Src: string
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
      id: 'mind-enterprises-idol',
      maxHeight: 48,
    },
    {
      title: 'Polaris',
      artist: 'Cyber People',
      id: 'cyber-people-polaris',
    },
    {
      title: 'Balance Ton Quoi',
      artist: 'Angèle',
      id: 'angele-balance-ton-quoi',
    },
    {
      title: 'Lost',
      artist: 'Frank Ocean',
      id: 'frank-ocean-lost',
    },
    {
      title: 'Something in the Orange',
      artist: 'Zach Bryan',
      id: 'zach-bryan-something-in-the-orange',
    },
  ],
  italy: [
    {
      title: 'Mystery of Love',
      artist: 'Sufjan Stevens',
      id: 'sufjan-stevens-mystery-of-love',
      maxHeight: 60,
    },
    {
      title: 'Always Forever',
      artist: 'Cults',
      id: 'cults-always-forever',
    },
    {
      title: 'Clarinet Concerto in A Major (Adagio)',
      artist: 'Mozart',
      id: 'mozart-clarinet-concerto-adagio',
      maxHeight: 64,
    },
    {
      title: 'Amore mio aiutami',
      artist: 'Piero Piccioni',
      id: 'piero-piccioni-amore-mio-aiutami',
      maxHeight: 48,
    },
  ],
  'san-francisco': [
    {
      title: 'Rose Quartz',
      artist: 'Toro y Moi',
      id: 'toro-y-moi-rose-quartz',
      maxHeight: 48,
    },
    {
      title: 'Comedown',
      artist: 'Parcels',
      id: 'parcels-comedown',
      maxHeight: 48,
    },
    {
      title: 'Night Time',
      artist: 'Superorganism',
      id: 'superorganism-night-time',
    },
    {
      title: "So We Won't Forget",
      artist: 'Khruangbin',
      id: 'khruangbin-so-we-wont-forget',
      maxHeight: 40,
    },
    {
      title: 'Sofia',
      artist: 'Clairo',
      id: 'clairo-sofia',
      maxHeight: 40,
    },
    {
      title: 'Dreaming',
      artist: 'Blondie',
      id: 'blondie-dreaming',
      maxHeight: 40,
    },
    {
      title: 'Ordinary Pleasure',
      artist: 'Toro y Moi',
      id: 'toro-y-moi-ordinary-pleasure',
    },
  ],
}

export const songCharacterLimit = 20
