import { useCallback, useEffect, useRef, type RefObject } from 'react'

const FREQUENCY_BANDS = [
  [20, 120],
  [120, 300],
  [300, 900],
  [900, 3000],
  [3000, 12000],
] as const

const MINIMUM_SCALE = 0.12

function getBandLevel(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  [minimumFrequency, maximumFrequency]: readonly [number, number],
) {
  const binWidth = sampleRate / fftSize
  const startBin = Math.max(1, Math.floor(minimumFrequency / binWidth))
  const endBin = Math.min(
    frequencyData.length - 1,
    Math.ceil(maximumFrequency / binWidth),
  )

  if (endBin < startBin) return 0

  let squaredTotal = 0
  for (let bin = startBin; bin <= endBin; bin += 1) {
    const normalizedMagnitude = frequencyData[bin] / 255
    squaredTotal += normalizedMagnitude * normalizedMagnitude
  }

  return Math.sqrt(squaredTotal / (endBin - startBin + 1))
}

export const SPECTRUM_BAR_COUNT = FREQUENCY_BANDS.length

export function useAudioSpectrum(audioRef: RefObject<HTMLAudioElement>) {
  const barRefs = useRef<Array<HTMLSpanElement | null>>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const frequencyDataRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number>()

  const resetSpectrum = useCallback(() => {
    barRefs.current.forEach((bar) => {
      if (bar) bar.style.transform = `scaleY(${MINIMUM_SCALE})`
    })
  }, [])

  const stopSpectrum = useCallback(() => {
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
    resetSpectrum()
  }, [resetSpectrum])

  const prepareSpectrum = useCallback(() => {
    const audio = audioRef.current
    if (!audio || typeof window === 'undefined' || !window.AudioContext) {
      return null
    }

    if (audioContextRef.current && analyserRef.current) {
      return audioContextRef.current
    }

    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaElementSource(audio)

      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.72
      analyser.minDecibels = -90
      analyser.maxDecibels = -15

      source.connect(analyser)
      analyser.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount)

      return audioContext
    } catch (error) {
      console.warn('Failed to initialize the audio spectrum:', error)
      return null
    }
  }, [audioRef])

  const resumeSpectrum = useCallback(() => {
    const audioContext = prepareSpectrum()
    if (!audioContext || audioContext.state !== 'suspended') {
      return Promise.resolve()
    }
    return audioContext.resume()
  }, [prepareSpectrum])

  const startSpectrum = useCallback(() => {
    const audioContext = prepareSpectrum()
    const analyser = analyserRef.current
    const frequencyData = frequencyDataRef.current

    if (!audioContext || !analyser || !frequencyData) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetSpectrum()
      return
    }

    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const updateSpectrum = () => {
      analyser.getByteFrequencyData(frequencyData)

      FREQUENCY_BANDS.forEach((band, index) => {
        const level = getBandLevel(
          frequencyData,
          audioContext.sampleRate,
          analyser.fftSize,
          band,
        )
        const scale = Math.max(MINIMUM_SCALE, Math.min(1, level))
        const bar = barRefs.current[index]
        if (bar) bar.style.transform = `scaleY(${scale})`
      })

      animationFrameRef.current = requestAnimationFrame(updateSpectrum)
    }

    updateSpectrum()
  }, [prepareSpectrum, resetSpectrum])

  useEffect(() => {
    return () => {
      stopSpectrum()
      const audioContext = audioContextRef.current
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close()
      }
    }
  }, [stopSpectrum])

  return {
    barRefs,
    prepareSpectrum,
    resumeSpectrum,
    startSpectrum,
    stopSpectrum,
  }
}
