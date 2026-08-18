import type { SongData } from '@/consts'

export function SpinningCD({
  song,
  isPlaying,
}: {
  song: SongData | null
  isPlaying: boolean
}) {
  if (!song) {
    return null
  }

  return (
    <div className="relative h-8 w-8">
      <div
        className="h-full w-full animate-[spin_12s_linear_infinite] overflow-hidden rounded-full border border-foreground/20 motion-reduce:animate-none"
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
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
