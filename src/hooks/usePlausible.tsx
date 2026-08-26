import { useEffect, useRef } from 'react'
import Plausible from 'plausible-tracker'
import { getPlausibleInstance } from '@/lib/plausible'

export const usePlausible = () => {
  const plausibleRef = useRef<ReturnType<typeof Plausible> | null>(null)

  useEffect(() => {
    plausibleRef.current = getPlausibleInstance()
  }, [])

  const trackEvent = (
    eventName: string,
    options?: { props?: Record<string, any> },
  ) => {
    if (plausibleRef.current) {
      plausibleRef.current.trackEvent(eventName, options)
    }
  }

  const trackPageview = (options?: { url?: string; referrer?: string }) => {
    if (plausibleRef.current) {
      plausibleRef.current.trackPageview(options)
    }
  }

  return {
    trackEvent,
    trackPageview,
  }
}

export default usePlausible
