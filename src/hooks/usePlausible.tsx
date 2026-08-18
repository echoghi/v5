import { useEffect, useRef } from 'react'
import Plausible from 'plausible-tracker'
import { analyticsConfig } from '@/lib/analytics-config'

let plausibleInstance: ReturnType<typeof Plausible> | null = null

const getPlausibleInstance = () => {
  if (!analyticsConfig) return null

  if (!plausibleInstance) {
    plausibleInstance = Plausible({
      domain: analyticsConfig.domain,
      apiHost: analyticsConfig.apiHost,
      trackLocalhost: false,
    })
  }
  return plausibleInstance
}

export const usePlausible = () => {
  const plausibleRef = useRef<ReturnType<typeof Plausible> | null>(null)

  useEffect(() => {
    // Initialize plausible on client side only
    if (typeof window !== 'undefined' && analyticsConfig) {
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
