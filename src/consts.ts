export type Song = {
  title: string
  artist: string
  id: string
  albumArtworkId?: string
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
      albumArtworkId: 'frank-ocean-channel-orange',
    },
  ],
  italy: [
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
      title: 'Friday Morning',
      artist: 'Khruangbin',
      id: 'khruangbin-friday-morning',
      albumArtworkId: 'khruangbin-con-todo-el-mundo',
    },
    {
      title: 'August 10',
      artist: 'Khruangbin',
      id: 'khruangbin-august-10',
      albumArtworkId: 'khruangbin-con-todo-el-mundo',
    },
    {
      title: 'The Long and Winding Road (Instrumental)',
      artist: 'The Beatles',
      id: 'the-beatles-the-long-and-winding-road-instrumental',
      albumArtworkId: 'the-beatles-let-it-be',
    },
    {
      title: 'These Days (Instrumental)',
      artist: 'Nico',
      id: 'nico-these-days-instrumental',
      albumArtworkId: 'nico-chelsea-girl',
    },
    {
      title: "Je t'aime... moi non plus (Instrumental)",
      artist: 'Serge Gainsbourg',
      id: 'serge-gainsbourg-je-taime-moi-non-plus-instrumental',
      albumArtworkId: 'jane-birkin-serge-gainsbourg',
    },
    {
      title: 'Fairy Fountain',
      artist: 'Koji Kondo',
      id: 'koji-kondo-fairy-fountain',
      albumArtworkId: 'koji-kondo-the-legend-of-zelda',
    },
    {
      title: 'Send It On (Instrumental)',
      artist: "D'Angelo",
      id: 'dangelo-send-it-on-instrumental',
      albumArtworkId: 'dangelo-voodoo',
    },
    {
      title: 'Really Love (Instrumental)',
      artist: "D'Angelo",
      id: 'dangelo-really-love-instrumental',
      albumArtworkId: 'dangelo-black-messiah',
    },
    {
      title: 'Spanish Joint (Instrumental)',
      artist: "D'Angelo",
      id: 'dangelo-spanish-joint-instrumental',
      albumArtworkId: 'dangelo-voodoo',
    },
    {
      title: 'Forrest Gump (Instrumental)',
      artist: 'Frank Ocean',
      id: 'frank-ocean-forrest-gump-instrumental',
      albumArtworkId: 'frank-ocean-channel-orange',
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
