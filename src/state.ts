import type { AppState, ViewMode, ControlIdx, NearbyStation } from './types'
import type { DitherMode } from './utils/dither'
import type { CityConfig } from './utils/cities'

export let activeCity: CityConfig | null = null
export function setActiveCity(c: CityConfig | null) { activeCity = c }
export function getStationInfoUrl(): string { return activeCity?.stationInfoUrl ?? '' }
export function getStationStatusUrl(): string { return activeCity?.stationStatusUrl ?? '' }
export const PAGE_SIZE = 3
export const MAX_FETCH = 12
export const REFRESH_MS = 30_000
export const GPS_UPDATE_MS = 2_000
export const FALLBACK_LAT = 40.7742744
export const FALLBACK_LON = -73.924307
export const TILE_W = 288
export const FULL_W = 576
export const FULL_H = 288
export const CTRL_H = 48
export const MAP_W = 288
export const MAP_H = 144
export const MAP_ZOOM_BASE = 15
export const SCROLL_DEBOUNCE_MS = 400

// page 0→z15, page 1→z14, page 2→z13, page 3→z12
export function zoomForPage(page: number): number {
  return Math.max(12, MAP_ZOOM_BASE - page)
}

export let appState: AppState = 'splash'
export let viewMode: ViewMode = 'available'
export let userLat = FALLBACK_LAT
export let userLon = FALLBACK_LON
export let allStations: NearbyStation[] = []
export let stations: NearbyStation[] = []
export let stationPage = 0
export let controlsCursor: ControlIdx = 0
export let refreshTimer: ReturnType<typeof setInterval> | null = null
export let gpsTimer: ReturnType<typeof setInterval> | null = null
export const DEFAULT_GLASSES_BRIGHTNESS = -15
export const DEFAULT_GLASSES_CONTRAST = -5
export const DEFAULT_GLASSES_DITHER: DitherMode = 'threshold'
export const DEFAULT_PHONE_BRIGHTNESS = 157
export const DEFAULT_PHONE_CONTRAST = 72
export const DEFAULT_PHONE_DITHER: DitherMode = 'threshold'
export const DEFAULT_PHONE_INVERT = false

export let glassesBrightness = DEFAULT_GLASSES_BRIGHTNESS
export let glassesContrast = DEFAULT_GLASSES_CONTRAST
export let glassesDitherMode: DitherMode = DEFAULT_GLASSES_DITHER
export let phoneDitherMode: DitherMode = DEFAULT_PHONE_DITHER
export let phoneBrightness = DEFAULT_PHONE_BRIGHTNESS
export let phoneContrast = DEFAULT_PHONE_CONTRAST
export let phoneInvert = DEFAULT_PHONE_INVERT

export function setAppState(v: AppState) { appState = v }
export function setViewMode(v: ViewMode) { viewMode = v }
export function setUserLat(v: number) { userLat = v }
export function setUserLon(v: number) { userLon = v }
export function setAllStations(v: NearbyStation[]) {
  allStations = v
  applyPage()
}
export function setStationPage(page: number) {
  stationPage = page
  applyPage()
}
export function setStations(v: NearbyStation[]) { stations = v }
export function setControlsCursor(v: ControlIdx) { controlsCursor = v }
export function setRefreshTimer(v: ReturnType<typeof setInterval> | null) { refreshTimer = v }
export function setGpsTimer(v: ReturnType<typeof setInterval> | null) { gpsTimer = v }
export function setGlassesBrightness(v: number) { glassesBrightness = v }
export function setGlassesContrast(v: number) { glassesContrast = v }
export function setGlassesDitherMode(v: DitherMode) { glassesDitherMode = v }
export function setPhoneDitherMode(v: DitherMode) { phoneDitherMode = v }
export function setPhoneBrightness(v: number) { phoneBrightness = v }
export function setPhoneContrast(v: number) { phoneContrast = v }
export function setPhoneInvert(v: boolean) { phoneInvert = v }

function applyPage() {
  const start = stationPage * PAGE_SIZE
  stations = allStations.slice(start, start + PAGE_SIZE)
}

export function maxPage(): number {
  return Math.max(0, Math.ceil(allStations.length / PAGE_SIZE) - 1)
}
