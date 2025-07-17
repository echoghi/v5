import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Minus, Plus } from 'lucide-react'
import { songs as playlists, songCharacterLimit } from '@/consts'
import { SpinningCD } from '@/components/SpinningCD'
import { cn, getSongDataById } from '@/lib/utils'
import type { SongData } from '@/lib/utils'

export default function MusicPlayer({ id }: { id: string }) {
  const playlist = playlists[id as keyof typeof playlists]
  if (!playlist) return null

  const [open, setOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(
    Math.floor(Math.random() * playlist.length),
  )
  const [hasInteracted, setHasInteracted] = useState(false)
  const [currentSongData, setCurrentSongData] = useState<SongData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load song data when current song changes
  useEffect(() => {
    const currentSong = playlist[currentSongIndex]
    if (!currentSong) return

    setIsLoading(true)
    getSongDataById(id, currentSong.id)
      .then((songData) => {
        setCurrentSongData(songData)
      })
      .catch((error) => {
        console.warn('Failed to load song data:', error)
        setCurrentSongData(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [currentSongIndex, playlist, id])

  // Add keyboard event listener for spacebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar if user has interacted with the player
      if (event.code === 'Space' && hasInteracted) {
        event.preventDefault() // Prevent page scroll
        togglePlay()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasInteracted, isPlaying])

  const expandPlayer = () => setOpen(true)
  const minimizePlayer = () => setOpen(false)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleFirstPlay = () => {
    setHasInteracted(true)
    setOpen(true)
    setIsPlaying(true)
    audioRef.current?.play()
  }

  const handleButtonClick = () => {
    if (!hasInteracted) {
      handleFirstPlay()
    } else {
      open ? minimizePlayer() : expandPlayer()
    }
  }

  const nextSong = () => {
    const nextIndex = (currentSongIndex + 1) % playlist.length
    setCurrentSongIndex(nextIndex)
    if (isPlaying && audioRef.current) {
      audioRef.current.load()
      // Wait for the audio to be ready before playing
      const handleCanPlay = () => {
        audioRef.current?.play()
        audioRef.current?.removeEventListener('canplay', handleCanPlay)
      }
      audioRef.current.addEventListener('canplay', handleCanPlay)
    }
  }

  const previousSong = () => {
    const prevIndex =
      currentSongIndex === 0 ? playlist.length - 1 : currentSongIndex - 1
    setCurrentSongIndex(prevIndex)
    if (isPlaying && audioRef.current) {
      audioRef.current.load()
      // Wait for the audio to be ready before playing
      const handleCanPlay = () => {
        audioRef.current?.play()
        audioRef.current?.removeEventListener('canplay', handleCanPlay)
      }
      audioRef.current.addEventListener('canplay', handleCanPlay)
    }
  }
  const waveform = currentSongData?.waveform || []
  const audioSrc = currentSongData?.mp3Src || ''

  const barRefs = [
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
  ]

  useEffect(() => {
    if (!audioRef.current || !waveform.length) return

    let animationFrameId: number
    const maxValue = Math.max(...waveform, 0.01)
    const maxHeight = currentSongData?.maxHeight || 32
    const scale = maxHeight / maxValue

    // Physics-based spring system
    const velocities = [0, 0, 0]
    let heights = [2, 2, 2]

    const stiffness = 0.2 // how fast it moves toward the target
    const damping = 0.5 // how much it bounces (0–1)

    const updateWave = () => {
      const audio = audioRef.current
      if (!audio) return

      // If not playing, set bars to minimum height and stop animation
      if (!isPlaying) {
        barRefs.forEach((barRef) => {
          if (barRef.current) {
            barRef.current.style.height = '2px'
          }
        })
        return
      }

      const currentTime = audio.currentTime
      const duration = audio.duration || 1
      const percent = currentTime / duration
      const index = Math.floor(percent * waveform.length)

      const getValue = (i: number) =>
        waveform[Math.min(i, waveform.length - 1)] || 0.05

      const target = [
        getValue(index),
        getValue(index + 1),
        getValue(index + 2),
      ].map((v) => Math.max(v * scale, 2))

      const updatedHeights = heights.map((h, i) => {
        const displacement = target[i] - h
        velocities[i] += displacement * stiffness
        velocities[i] *= damping
        const newHeight = h + velocities[i]
        return Math.max(2, Math.min(24, newHeight))
      })

      heights = updatedHeights

      updatedHeights.forEach((height, i) => {
        if (barRefs[i].current) {
          barRefs[i].current.style.height = `${height}px`
        }
      })

      animationFrameId = requestAnimationFrame(updateWave)
    }

    animationFrameId = requestAnimationFrame(updateWave)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, waveform])

  return (
    <div className="fixed bottom-8 left-8 z-[99] hidden 2xl:block">
      <button
        onClick={handleButtonClick}
        className="absolute -right-4 -top-4 z-[999] rounded-full border-2 border-foreground/10 bg-foreground/10 p-2 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
      >
        {!hasInteracted ? (
          <Play
            className="fill-foreground text-foreground dark:fill-none"
            size={16}
          />
        ) : !open ? (
          <Plus className="text-foreground" size={16} />
        ) : (
          <Minus className="text-foreground" size={16} />
        )}
      </button>
      <div className="relative flex h-[56px] max-w-md items-center justify-between gap-6 rounded-md bg-foreground/10 px-6 shadow-md transition-all">
        <div
          className={cn('flex items-center gap-6', !hasInteracted && 'gap-0')}
        >
          {/* Spinning CD */}
          <SpinningCD
            song={currentSongData}
            isPlaying={isPlaying}
            hasInteracted={hasInteracted}
          />

          {/* Animated bars */}
          <div
            className="flex items-end gap-[4px] overflow-hidden"
            style={{ height: '24px' }}
          >
            {!hasInteracted ? (
              <></>
            ) : waveform.length ? (
              [0, 1, 2].map((i) => (
                <span
                  key={i}
                  ref={barRefs[i]}
                  className="w-1 bg-foreground transition-[height] duration-100 will-change-[height]"
                  style={{ height: '2px' }}
                />
              ))
            ) : (
              [0, 1, 2].map((i) => {
                const delay = `${i * 100 + Math.random() * 80}ms`
                const duration = `${0.9 + Math.random() * 0.4}s`
                return (
                  <span
                    key={i}
                    className="w-1 origin-bottom bg-foreground"
                    style={{
                      height: isPlaying ? '100%' : '2px',
                      animationName: isPlaying ? 'waveBounce' : 'none',
                      animationDuration: duration,
                      animationDelay: delay,
                      animationIterationCount: 'infinite',
                      animationTimingFunction: 'ease-in-out',
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                  />
                )
              })
            )}
          </div>
        </div>

        {open && (
          <>
            <div className="flex items-center gap-2 pr-4">
              <div className="max-w-[200px]">
                <h3 className="whitespace-nowrap text-base font-bold leading-tight text-foreground">
                  {currentSongData &&
                  currentSongData?.title?.length > songCharacterLimit
                    ? `${currentSongData.title.substring(0, songCharacterLimit)}...`
                    : currentSongData?.title}
                </h3>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={`${currentSongData?.title} by ${currentSongData?.artist}`}
                >
                  {currentSongData &&
                  currentSongData?.artist?.length > songCharacterLimit
                    ? `${currentSongData.artist.substring(0, songCharacterLimit)}...`
                    : currentSongData?.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-foreground">
              <SkipBack
                className="cursor-pointer fill-foreground dark:fill-none"
                size={18}
                onClick={previousSong}
              />
              {isPlaying ? (
                <Pause
                  className="cursor-pointer fill-foreground dark:fill-none"
                  onClick={togglePlay}
                  size={22}
                />
              ) : (
                <Play
                  className="cursor-pointer fill-foreground dark:fill-none"
                  onClick={togglePlay}
                  size={22}
                />
              )}
              <SkipForward
                className="cursor-pointer fill-foreground dark:fill-none"
                size={18}
                onClick={nextSong}
              />
            </div>
          </>
        )}

        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onEnded={nextSong}
        />
      </div>
    </div>
  )
}
