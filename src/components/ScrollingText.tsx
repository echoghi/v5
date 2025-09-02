import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScrollingTextProps {
  text: string
  className?: string
  speed?: number
}

export function ScrollingText({
  text,
  className,
  speed = 80,
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const positionRef = useRef(0)
  const [shouldScroll, setShouldScroll] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Store animation-related values in refs to avoid re-renders
  const maxDistanceRef = useRef(0)
  const isAnimatingRef = useRef(false)

  // Check if text overflows its container
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const textWidth = textRef.current.scrollWidth

        // Only set shouldScroll if text is actually wider than container
        const shouldScrollNow = textWidth > containerWidth
        maxDistanceRef.current = shouldScrollNow
          ? textWidth - containerWidth
          : 0
        setShouldScroll(shouldScrollNow)

        // Reset position if text doesn't need to scroll
        if (!shouldScrollNow) {
          positionRef.current = 0
          if (textRef.current) {
            textRef.current.style.transform = `translateX(0px)`
          }
        }
      }
    }

    checkOverflow()

    window.addEventListener('resize', checkOverflow)
    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [text])

  // Handle the animation directly with DOM manipulation instead of React state
  useEffect(() => {
    // Start animation when hovering
    const startAnimation = () => {
      if (!shouldScroll || !isHovering || isAnimatingRef.current) return

      isAnimatingRef.current = true
      let lastTimestamp: number | null = null
      const pixelsPerMs = speed / 1000

      const step = (timestamp: number) => {
        if (!isHovering || !textRef.current) {
          isAnimatingRef.current = false
          return
        }

        if (lastTimestamp === null) {
          lastTimestamp = timestamp
          animationRef.current = requestAnimationFrame(step)
          return
        }

        const elapsed = timestamp - lastTimestamp
        const delta = elapsed * pixelsPerMs

        // Update position directly without state changes
        positionRef.current = Math.min(
          maxDistanceRef.current,
          positionRef.current + delta,
        )

        if (textRef.current) {
          textRef.current.style.transform = `translateX(-${positionRef.current}px)`
        }

        // Stop animation if we've scrolled far enough
        if (positionRef.current >= maxDistanceRef.current) {
          isAnimatingRef.current = false
          return
        }

        lastTimestamp = timestamp
        animationRef.current = requestAnimationFrame(step)
      }

      animationRef.current = requestAnimationFrame(step)
    }

    // Reset animation when not hovering
    const resetAnimation = () => {
      if (!textRef.current) return

      // Immediately snap back to original position without animation
      positionRef.current = 0
      textRef.current.style.transform = `translateX(0px)`
      isAnimatingRef.current = false

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    if (isHovering) {
      startAnimation()
    } else {
      resetAnimation()
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isHovering, shouldScroll, speed])

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden whitespace-nowrap', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={textRef}
        className={cn(
          'inline-block whitespace-nowrap',
          shouldScroll && 'will-change-transform',
        )}
        style={{
          transform: `translateX(0px)`,
        }}
      >
        {text}
      </div>
    </div>
  )
}
