import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NoiseOverlayProps {
  image: string
  className?: string
}

export function NoiseOverlay({ image, className = '' }: NoiseOverlayProps) {
  const [baseFrequency, setBaseFrequency] = React.useState(0.75)
  const [opacity, setOpacity] = React.useState(0.3)
  const [noiseEnabled, setNoiseEnabled] = React.useState(true)

  const updateBaseFrequency = React.useCallback((value: number) => {
    setBaseFrequency(Math.min(2, Math.max(0.1, value)))
  }, [])

  const updateOpacity = React.useCallback((value: number) => {
    setOpacity(Math.min(1, Math.max(0, value)))
  }, [])

  const noiseSvg = React.useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)" opacity="${opacity}"/></svg>`

    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [baseFrequency, opacity])

  return (
    <div>
      <div className={cn('relative mb-8', className)}>
        <img src={image} alt="Base image" className="mb-1 h-full w-full" />
        {noiseEnabled && (
          <div
            className="absolute inset-0"
            style={{
              background: `url("${noiseSvg}")`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div className="space-y-4">
        <label
          htmlFor="noise-toggle"
          className="flex w-fit cursor-pointer items-center gap-2"
        >
          <input
            id="noise-toggle"
            type="checkbox"
            className="peer sr-only"
            checked={noiseEnabled}
            onChange={(event) => setNoiseEnabled(event.currentTarget.checked)}
          />
          <span className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent bg-border shadow-sm transition-colors after:block after:h-4 after:w-4 after:rounded-full after:bg-background after:shadow-lg after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
          <span>Noise Overlay</span>
        </label>

        <div className="space-y-2">
          <div>Base Frequency: {baseFrequency.toFixed(2)}</div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="Decrease base frequency"
              disabled={!noiseEnabled}
              onClick={() => updateBaseFrequency(baseFrequency - 0.05)}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <input
              type="range"
              value={baseFrequency}
              onChange={(event) =>
                updateBaseFrequency(Number(event.currentTarget.value))
              }
              min={0.1}
              max={2}
              step={0.05}
              disabled={!noiseEnabled}
              aria-label="Base frequency"
              className="h-10 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="Increase base frequency"
              disabled={!noiseEnabled}
              onClick={() => updateBaseFrequency(baseFrequency + 0.05)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div>Opacity: {opacity.toFixed(2)}</div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="Decrease opacity"
              disabled={!noiseEnabled}
              onClick={() => updateOpacity(opacity - 0.05)}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <input
              type="range"
              value={opacity}
              onChange={(event) =>
                updateOpacity(Number(event.currentTarget.value))
              }
              min={0}
              max={1}
              step={0.05}
              disabled={!noiseEnabled}
              aria-label="Opacity"
              className="h-10 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11"
              aria-label="Increase opacity"
              disabled={!noiseEnabled}
              onClick={() => updateOpacity(opacity + 0.05)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
