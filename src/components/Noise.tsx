import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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

  const handleFrequencyChange = React.useCallback((value: number[]) => {
    updateBaseFrequency(value[0])
  }, [updateBaseFrequency])

  const handleOpacityChange = React.useCallback((value: number[]) => {
    updateOpacity(value[0])
  }, [updateOpacity])

  const handleNoiseToggle = React.useCallback((checked: boolean) => {
    setNoiseEnabled(checked)
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
        <div className="flex items-center space-x-2">
          <Switch
            id="noise-toggle"
            checked={noiseEnabled}
            onCheckedChange={handleNoiseToggle}
          />
          <Label htmlFor="noise-toggle">Noise Overlay</Label>
        </div>

        <div className="space-y-2">
          <Label>Base Frequency: {baseFrequency.toFixed(2)}</Label>
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
            <Slider
              value={[baseFrequency]}
              onValueChange={handleFrequencyChange}
              min={0.1}
              max={2}
              step={0.05}
              disabled={!noiseEnabled}
              aria-label="Base frequency"
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
          <Label>Opacity: {opacity.toFixed(2)}</Label>
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
            <Slider
              value={[opacity]}
              onValueChange={handleOpacityChange}
              min={0}
              max={1}
              step={0.05}
              disabled={!noiseEnabled}
              aria-label="Opacity"
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
