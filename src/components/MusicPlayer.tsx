import { useEffect, useRef, useState } from 'react'
import { Minus, Pause, Play, Plus, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { songs as playlists, type Song, type SongData } from '@/consts'
import { SpinningCD } from '@/components/SpinningCD'
import { ScrollingText } from '@/components/ScrollingText'
import usePlausible from '@/hooks/usePlausible'
import { SPECTRUM_BAR_COUNT, useAudioSpectrum } from '@/hooks/useAudioSpectrum'

function createSongData(
  locationId: string,
  song: Song,
  albumArtworkBaseUrl?: string,
): SongData {
  return {
    ...song,
    albumCover: albumArtworkBaseUrl
      ? `${albumArtworkBaseUrl}/${song.id}.webp`
      : '/static/logo.png',
    mp3Src: `/audio/${locationId}/${song.id}.mp3`,
  }
}

function MusicPlayer({
  id,
  playlist,
  albumArtworkBaseUrl,
}: {
  id: string
  playlist: Song[]
  albumArtworkBaseUrl?: string
}) {
  const { trackEvent } = usePlausible()
  const [open, setOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playbackRequestedRef = useRef(false)
  const trackedSongRef = useRef<string | null>(null)
  const {
    barRefs,
    prepareSpectrum,
    resumeSpectrum,
    startSpectrum,
    stopSpectrum,
  } = useAudioSpectrum(audioRef)

  const currentSong = playlist[currentSongIndex] ?? playlist[0]
  const currentSongData = createSongData(id, currentSong, albumArtworkBaseUrl)

  const handlePlaybackError = (error: unknown) => {
    playbackRequestedRef.current = false
    setIsPlaying(false)
    stopSpectrum()
    console.warn('Audio playback failed:', error)
  }

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

  const nextSong = () => {
    setCurrentSongIndex((index) => (index + 1) % playlist.length)
  }

  const previousSong = () => {
    setCurrentSongIndex((index) =>
      index === 0 ? playlist.length - 1 : index - 1,
    )
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.load()
    if (playbackRequestedRef.current) {
      void audio.play().catch(handlePlaybackError)
    }
  }, [currentSongData.mp3Src])

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

  const handlePlay = () => {
    playbackRequestedRef.current = true
    setIsPlaying(true)
    startSpectrum()

    if (trackedSongRef.current !== currentSongData.id) {
      trackedSongRef.current = currentSongData.id
      trackEvent('song', {
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

  const primaryButtonLabel = !hasInteracted
    ? `Play ${currentSongData.title}`
    : open
      ? 'Minimize music player'
      : 'Expand music player'

  return (
    <div className="fixed bottom-8 left-8 z-[99] hidden 2xl:block">
      <button
        type="button"
        aria-label={primaryButtonLabel}
        onClick={handlePrimaryButton}
        className="absolute -right-4 -top-4 z-[999] rounded-full border-2 border-foreground/10 bg-foreground/10 p-2 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
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

      <div className="relative flex h-[56px] max-w-md items-center justify-between gap-6 rounded-md bg-foreground/10 px-6 shadow-md transition-all">
        <div
          className={cn('flex items-center gap-6', !hasInteracted && 'gap-0')}
        >
          <SpinningCD song={currentSongData} isPlaying={isPlaying} />

          <div
            aria-hidden="true"
            className="flex h-6 items-end gap-[3px] overflow-hidden"
          >
            {hasInteracted
              ? Array.from({ length: SPECTRUM_BAR_COUNT }, (_, index) => (
                  <span
                    key={index}
                    ref={(element) => {
                      barRefs.current[index] = element
                    }}
                    className="h-full w-[3px] origin-bottom scale-y-[0.12] bg-foreground motion-reduce:transform-none"
                    style={{ willChange: 'transform' }}
                  />
                ))
              : null}
          </div>
        </div>

        {open ? (
          <>
            <div className="flex items-center gap-2 pr-4">
              <div className="max-w-[150px]">
                <h3 className="text-base font-bold leading-tight text-foreground">
                  <ScrollingText
                    text={currentSongData.title}
                    className="max-w-full"
                    speed={100}
                  />
                </h3>
                <p
                  className="text-xs text-muted-foreground"
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

            <div className="flex items-center gap-4 text-foreground">
              <button
                type="button"
                aria-label="Previous song"
                onClick={previousSong}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <SkipBack
                  aria-hidden="true"
                  className="fill-foreground dark:fill-none"
                  size={18}
                />
              </button>

              <button
                type="button"
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
                onClick={togglePlay}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                {isPlaying ? (
                  <Pause
                    aria-hidden="true"
                    className="fill-foreground dark:fill-none"
                    size={22}
                  />
                ) : (
                  <Play
                    aria-hidden="true"
                    className="fill-foreground dark:fill-none"
                    size={22}
                  />
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
                  className="fill-foreground dark:fill-none"
                  size={18}
                />
              </button>
            </div>
          </>
        ) : null}

        <audio
          ref={audioRef}
          src={currentSongData.mp3Src}
          preload="metadata"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={nextSong}
          onError={() => handlePlaybackError(audioRef.current?.error)}
        />
      </div>
    </div>
  )
}

export default function MusicPlayerForGallery({
  id,
  albumArtworkBaseUrl,
}: {
  id: string
  albumArtworkBaseUrl?: string
}) {
  const playlist = playlists[id]
  if (!playlist?.length) return null
  return (
    <MusicPlayer
      id={id}
      playlist={playlist}
      albumArtworkBaseUrl={albumArtworkBaseUrl}
    />
  )
}
