import { useEffect, useRef } from 'react'
import Plausible from 'plausible-tracker'

// Configuration based on .env
const PLAUSIBLE_DOMAIN = import.meta.env.DOMAIN || 'emile.sh'
const ANALYTICS_URL = import.meta.env.ANALYTICS_URL || 'https://plausible.io'

let plausibleInstance: ReturnType<typeof Plausible> | null = null

const getPlausibleInstance = () => {
  if (!plausibleInstance) {
    plausibleInstance = Plausible({
      domain: PLAUSIBLE_DOMAIN,
      apiHost: ANALYTICS_URL,
      trackLocalhost: false,
    })
  }
  return plausibleInstance
}

export const usePlausible = () => {
  const plausibleRef = useRef<ReturnType<typeof Plausible> | null>(null)

  useEffect(() => {
    // Initialize plausible on client side only
    if (typeof window !== 'undefined') {
      plausibleRef.current = getPlausibleInstance()
    }
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
