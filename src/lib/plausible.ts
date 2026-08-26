import Plausible, { type EventOptions } from 'plausible-tracker'
import { analyticsConfig } from '@/lib/analytics-config'

let plausibleInstance: ReturnType<typeof Plausible> | null = null

export function getPlausibleInstance() {
  if (!analyticsConfig || typeof window === 'undefined') return null

  if (!plausibleInstance) {
    plausibleInstance = Plausible({
      domain: analyticsConfig.domain,
      apiHost: analyticsConfig.apiHost,
      trackLocalhost: false,
    })
  }

  return plausibleInstance
}

export function trackPlausibleEvent(
  eventName: string,
  props?: EventOptions['props'],
) {
  getPlausibleInstance()?.trackEvent(eventName, { props })
}
