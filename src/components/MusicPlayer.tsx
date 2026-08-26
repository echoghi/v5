import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  photostreamPlaylist,
  songs as playlists,
  type PlaylistSong,
  type SongData,
} from '@/consts'
import { SpinningCD } from '@/components/SpinningCD'
import { ScrollingText } from '@/components/ScrollingText'
import { SPECTRUM_BAR_COUNT, useAudioSpectrum } from '@/hooks/useAudioSpectrum'

type PlausibleWindow = Window & {
  plausible?: (
    eventName: string,
    options?: { props?: Record<string, string> },
  ) => void
}

function createSongData(
  song: PlaylistSong,
  albumArtworkBaseUrl?: string,
): SongData {
  return {
    ...song,
    albumCover: albumArtworkBaseUrl
      ? `${albumArtworkBaseUrl}/${song.id}.webp`
      : '/static/logo.png',
    mp3Src: `/audio/${song.collectionId}/${song.id}.mp3`,
  }
}

function shufflePlaylist(playlist: PlaylistSong[]): PlaylistSong[] {
  const shuffled = [...playlist]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentSong = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = currentSong
  }

  return shuffled
}

function MusicPlayer({
  playlist,
  albumArtworkBaseUrl,
}: {
  playlist: PlaylistSong[]
  albumArtworkBaseUrl?: string
}) {
  const [open, setOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [shuffledPlaylist] = useState(() => shufflePlaylist(playlist))
  const [audio] = useState(() => {
    const element = new Audio()
    element.preload = 'metadata'
    return element
  })
  const audioRef = useRef(audio)
  const playbackRequestedRef = useRef(false)
  const trackedSongRef = useRef<string | null>(null)
  const {
    barRefs,
    prepareSpectrum,
    resumeSpectrum,
    startSpectrum,
    stopSpectrum,
  } = useAudioSpectrum(audioRef)

  const currentSong = shuffledPlaylist[currentSongIndex] ?? shuffledPlaylist[0]
  const currentSongData = createSongData(currentSong, albumArtworkBaseUrl)

  const handlePlaybackError = useCallback(
    (error: unknown) => {
      playbackRequestedRef.current = false
      setIsPlaying(false)
      stopSpectrum()
      console.warn('Audio playback failed:', error)
    },
    [stopSpectrum],
  )

  const playAudio = async () => {
    const audio = audioRef.current
    if (!audio) return

    playbackRequestedRef.current = true

    // Begin both calls inside the user gesture for autoplay-restricted browsers.
    const contextPromise = resumeSpectrum()
    const playbackPromise = audio.play()

    try {
      await Promise.all([contextPromise, playbackPromise])
    } catch (error) {
      handlePlaybackError(error)
    }
  }

  const pauseAudio = () => {
    playbackRequestedRef.current = false
    audioRef.current?.pause()
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void playAudio()
    } else {
      pauseAudio()
    }
  }

  const nextSong = useCallback(() => {
    setCurrentSongIndex((index) => (index + 1) % shuffledPlaylist.length)
  }, [shuffledPlaylist.length])

  const previousSong = () => {
    setCurrentSongIndex((index) =>
      index === 0 ? shuffledPlaylist.length - 1 : index - 1,
    )
  }

  useEffect(() => {
    if (audio.getAttribute('src') === currentSongData.mp3Src) return

    audio.src = currentSongData.mp3Src
    audio.load()
    if (playbackRequestedRef.current) {
      void audio.play().catch(handlePlaybackError)
    }
  }, [audio, currentSongData.mp3Src, handlePlaybackError])

  useEffect(() => {
    const handlePlay = () => {
      playbackRequestedRef.current = true
      setIsPlaying(true)
      startSpectrum()

      if (trackedSongRef.current !== currentSongData.id) {
        trackedSongRef.current = currentSongData.id
        ;(window as PlausibleWindow).plausible?.('song', {
          props: {
            title: currentSongData.title,
            artist: currentSongData.artist,
          },
        })
      }
    }
    const handlePause = () => {
      setIsPlaying(false)
      stopSpectrum()
    }
    const handleError = () => handlePlaybackError(audio.error)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', nextSong)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', nextSong)
      audio.removeEventListener('error', handleError)
    }
  }, [
    audio,
    currentSongData.artist,
    currentSongData.id,
    currentSongData.title,
    handlePlaybackError,
    nextSong,
    startSpectrum,
    stopSpectrum,
  ])

  useEffect(() => {
    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [audio])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable = target?.closest(
        'input, textarea, select, button, [contenteditable="true"]',
      )

      if (event.code === 'Space' && hasInteracted && !isEditable) {
        event.preventDefault()
        togglePlay()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasInteracted])

  const handlePrimaryButton = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
      setOpen(true)
      prepareSpectrum()
      void playAudio()
      return
    }

    setOpen((isOpen) => !isOpen)
  }

  const primaryButtonLabel = !hasInteracted
    ? `Play ${currentSongData.title}`
    : open
      ? 'Minimize music player'
      : 'Expand music player'

  return (
    <div className="fixed bottom-3 left-3 z-[120] text-white [--background:0_0_0] [--foreground:1_0_0] [--muted-foreground:0.78_0_0] sm:bottom-5 sm:left-5">
      <button
        type="button"
        aria-label={primaryButtonLabel}
        onClick={handlePrimaryButton}
        className="liquid-glass absolute -right-3 -top-3 z-[2] rounded-full p-2 text-white transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {!hasInteracted ? (
          <Play
            aria-hidden="true"
            className="fill-foreground text-foreground dark:fill-none"
            size={16}
          />
        ) : !open ? (
          <Plus aria-hidden="true" className="text-foreground" size={16} />
        ) : (
          <Minus aria-hidden="true" className="text-foreground" size={16} />
        )}
      </button>

      <div
        className={cn(
          'liquid-glass relative flex h-14 items-center justify-between overflow-hidden rounded-full px-4 shadow-2xl transition-[width,padding] duration-300 sm:px-5',
          open
            ? 'w-[min(30rem,calc(100vw-2.5rem))] gap-3 sm:gap-5'
            : 'w-[66px] sm:w-[74px]',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center',
            hasInteracted ? 'gap-3' : 'gap-0',
          )}
        >
          <SpinningCD song={currentSongData} isPlaying={isPlaying} />

          {open ? (
            <div
              aria-hidden="true"
              className="flex h-6 items-end gap-[3px] overflow-hidden"
            >
              {Array.from({ length: SPECTRUM_BAR_COUNT }, (_, index) => (
                <span
                  key={index}
                  ref={(element) => {
                    barRefs.current[index] = element
                  }}
                  className="h-full w-[3px] origin-bottom scale-y-[0.12] bg-white motion-reduce:transform-none"
                  style={{ willChange: 'transform' }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {open ? (
          <>
            <div className="min-w-0 flex-1 pr-1 sm:pr-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight text-white sm:text-base">
                  <ScrollingText
                    text={currentSongData.title}
                    className="max-w-full"
                    speed={100}
                  />
                </h3>
                <p
                  className="text-xs text-white/55"
                  title={`${currentSongData.title} by ${currentSongData.artist}`}
                >
                  <ScrollingText
                    text={currentSongData.artist}
                    className="max-w-full"
                    speed={80}
                  />
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 text-white sm:gap-4">
              <button
                type="button"
                aria-label="Previous song"
                onClick={previousSong}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <SkipBack aria-hidden="true" className="fill-white" size={18} />
              </button>

              <button
                type="button"
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
                onClick={togglePlay}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="fill-white" size={22} />
                ) : (
                  <Play aria-hidden="true" className="fill-white" size={22} />
                )}
              </button>

              <button
                type="button"
                aria-label="Next song"
                onClick={nextSong}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <SkipForward
                  aria-hidden="true"
                  className="fill-white"
                  size={18}
                />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function MusicPlayerOverlay({
  id,
  albumArtworkBaseUrl,
}: {
  id?: string
  albumArtworkBaseUrl?: string
}) {
  const playlist: PlaylistSong[] = id
    ? (playlists[id] ?? []).map((song) => ({ ...song, collectionId: id }))
    : photostreamPlaylist

  if (!playlist?.length) return null
  return (
    <MusicPlayer
      playlist={playlist}
      albumArtworkBaseUrl={albumArtworkBaseUrl}
    />
  )
}
