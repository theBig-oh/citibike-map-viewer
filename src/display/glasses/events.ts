import { appState, controlsCursor, refreshTimer, gpsTimer, setControlsCursor, setRefreshTimer, setGpsTimer, SCROLL_DEBOUNCE_MS, maxPage, GPS_UPDATE_MS } from '../../state'
import type { ControlIdx } from '../../types'
import { showMenu, showDetail, updateMenuInPlace, updateDetailInPlace, showNoService } from './screens'
import { getUserLocation } from '../../utils/geo'
import { invalidateMapCache } from '../../utils/map'
import { fetchStations } from '../../utils/geo'
import { setUserLat, setUserLon, setAllStations, setStationPage, stationPage, userLat, userLon, REFRESH_MS, activeCity, setActiveCity } from '../../state'
import { detectCity } from '../../utils/cities'

let bridgeRef: any = null
export function setEventsBridge(b: any) { bridgeRef = b }

let lastScrollMs = 0
let lastRefreshMs = 0
let gpsUpdating = false  // guard: skip if previous GPS+render still in flight
export function getLastRefreshMs() { return lastRefreshMs }

export function registerGlassesEvents() {
  bridgeRef.onEvenHubEvent(async (event: any) => {
    if (appState === 'menu') {
      if (event.textEvent) {
        const now = Date.now()
        if (now - lastScrollMs < SCROLL_DEBOUNCE_MS) return
        lastScrollMs = now
        const type = event.textEvent.eventType ?? 0
        if (type === 1) setControlsCursor(((controlsCursor - 1 + 3) % 3) as ControlIdx)
        else if (type === 2) setControlsCursor(((controlsCursor + 1) % 3) as ControlIdx)
        await updateMenuInPlace()
        return
      }
      if (event.sysEvent) {
        const type = event.sysEvent.eventType ?? 0
        if (type === 0) {
          if (controlsCursor === 2) bridgeRef.shutDownPageContainer(1)
          else await showDetail(controlsCursor === 0 ? 'available' : 'docked')
        }
        return
      }
    }

    if (appState === 'detail') {
      if (event.textEvent) {
        const now = Date.now()
        if (now - lastScrollMs < SCROLL_DEBOUNCE_MS) return
        lastScrollMs = now
        const type = event.textEvent.eventType ?? 0
        if (type === 1 && stationPage > 0) {
          setStationPage(stationPage - 1)
          invalidateMapCache()
          await updateDetailInPlace()
        } else if (type === 2 && stationPage < maxPage()) {
          setStationPage(stationPage + 1)
          invalidateMapCache()
          await updateDetailInPlace()
        }
        return
      }
      if (event.sysEvent) {
        const type = event.sysEvent.eventType ?? 0
        if (type === 0 || type === 3) {
          await showMenu()
          return
        }
      }
    }

    if (event.sysEvent) {
      const type = event.sysEvent.eventType ?? 0
      if (type === 4 && appState === 'detail') await refreshData()
      else if (type === 5 || type === 6 || type === 7) {
        if (refreshTimer) clearInterval(refreshTimer)
        if (gpsTimer) clearInterval(gpsTimer)
      }
    }
  })

  lastRefreshMs = Date.now()
  const timer = setInterval(refreshData, REFRESH_MS)
  setRefreshTimer(timer)

  const gpsPoll = setInterval(updateGpsPosition, GPS_UPDATE_MS)
  setGpsTimer(gpsPoll)
}

// GPS-only update: reposition user dot, no station re-fetch
async function updateGpsPosition() {
  if (gpsUpdating || appState !== 'detail') return
  gpsUpdating = true
  try {
    const loc = await getUserLocation()
    const moved = loc.lat !== userLat || loc.lon !== userLon
    if (moved) {
      setUserLat(loc.lat)
      setUserLon(loc.lon)
      invalidateMapCache()
      await updateDetailInPlace()
    }
  } catch (e) {
    console.warn('GPS update failed:', e)
  } finally {
    gpsUpdating = false
  }
}

// Full refresh: new GPS + re-fetch stations
export async function refreshData(force = false) {
  if (!force && stationPage !== 0) return
  lastRefreshMs = Date.now()
  try {
    const loc = await getUserLocation()
    setUserLat(loc.lat)
    setUserLon(loc.lon)

    // Detect city on first fix or if not yet set
    if (!activeCity) {
      const city = detectCity(loc.lat, loc.lon)
      setActiveCity(city)
      if (!city) {
        await showNoService()
        return
      }
    }

    const s = await fetchStations(userLat, userLon)
    setStationPage(0)
    setAllStations(s)
    invalidateMapCache()
    if (appState === 'detail') await updateDetailInPlace()
  } catch (e) {
    console.error('Refresh failed:', e)
  }
}
