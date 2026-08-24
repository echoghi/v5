export type Song = {
  title: string
  artist: string
  id: string
}

export type PlaylistSong = Song & {
  collectionId: string
}

export interface SongData {
  title: string
  artist: string
  id: string
  albumCover: string
  mp3Src: string
}

export const songs: Record<string, Song[]> = {
  'palo-alto': [
    {
      title: 'Idol',
      artist: 'Mind Enterprises',
      id: 'mind-enterprises-idol',
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
    },
    {
      title: 'From Up on Poppy Hill',
      artist: 'Satoshi Takebe',
      id: 'satoshi-takebe-from-up-on-poppy-hill',
    },
    {
      title: 'Clarinet Concerto in A Major (Adagio)',
      artist: 'Mozart',
      id: 'mozart-clarinet-concerto-adagio',
    },
    {
      title: 'Amore mio aiutami',
      artist: 'Piero Piccioni',
      id: 'piero-piccioni-amore-mio-aiutami',
    },
  ],
  'san-francisco': [
    {
      title: 'Rose Quartz',
      artist: 'Toro y Moi',
      id: 'toro-y-moi-rose-quartz',
    },
    {
      title: 'Comedown',
      artist: 'Parcels',
      id: 'parcels-comedown',
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
    },
    {
      title: 'Sofia',
      artist: 'Clairo',
      id: 'clairo-sofia',
    },
    {
      title: 'Dreaming',
      artist: 'Blondie',
      id: 'blondie-dreaming',
    },
    {
      title: 'Ordinary Pleasure',
      artist: 'Toro y Moi',
      id: 'toro-y-moi-ordinary-pleasure',
    },
  ],
}

export const photostreamPlaylist: PlaylistSong[] = Object.entries(
  songs,
).flatMap(([collectionId, playlist]) =>
  playlist.map((song) => ({ ...song, collectionId })),
)
