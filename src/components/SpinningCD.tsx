import { useRef, useEffect } from 'react'
import type { SongData } from '@/consts'

export function SpinningCD({
  song,
  isPlaying,
  hasInteracted,
}: {
  song: SongData | null
  isPlaying: boolean
  hasInteracted: boolean
}) {
  const cdRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>()

  useEffect(() => {
    if (!song) return

    const cdElement = cdRef.current
    if (!cdElement) return

    const rotationSpeed = 270 // degrees per second (360° / 12s)

    const animate = (currentTime: number) => {
      if (!isPlaying) {
        // Stop animation but keep current rotation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        return
      }

      if (lastTimeRef.current !== undefined) {
        const deltaTime = currentTime - lastTimeRef.current
        const deltaRotation = (deltaTime * rotationSpeed) / 1000
        rotationRef.current = rotationRef.current + deltaRotation
      }

      lastTimeRef.current = currentTime
      cdElement.style.transform = `rotate(${rotationRef.current}deg)`

      animationRef.current = requestAnimationFrame(animate)
    }

    if (isPlaying) {
      lastTimeRef.current = undefined // Reset time reference when starting
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, hasInteracted, song])

  if (!song) {
    return null
  }

  return (
    <div className="relative h-8 w-8">
      <div
        ref={cdRef}
        className="h-full w-full overflow-hidden rounded-full border border-foreground/20 transition-transform duration-100"
      >
        <img
          src={song.albumCover}
          alt={`${song.title} by ${song.artist}`}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>
      {/* CD center hole */}
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 transform rounded-full border border-foreground/20 bg-background"></div>
    </div>
  )
}
