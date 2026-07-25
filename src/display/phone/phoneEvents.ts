import { appState, viewMode, setViewMode, stationPage, setStationPage, maxPage, REFRESH_MS, setRefreshMs, setGpsUpdateMs, DEFAULT_REFRESH_MS, DEFAULT_GPS_UPDATE_MS, setGlassesBrightness, setGlassesContrast, setGlassesDitherMode, setPhoneDitherMode, setPhoneBrightness, setPhoneContrast, setPhoneInvert, DEFAULT_GLASSES_BRIGHTNESS, DEFAULT_GLASSES_CONTRAST, DEFAULT_GLASSES_DITHER, DEFAULT_PHONE_BRIGHTNESS, DEFAULT_PHONE_CONTRAST, DEFAULT_PHONE_DITHER, DEFAULT_PHONE_INVERT, activeCity, setActiveCity } from '../../state'
import type { ViewMode } from '../../types'
import { updatePhoneUI } from './phoneUI'
import { updateDetailInPlace } from '../glasses/screens'
import { invalidateMapCache } from '../../utils/map'
import { refreshData, getLastRefreshMs, restartTimers } from '../glasses/events'
import { DITHER_MODES } from '../../utils/dither'
import type { DitherMode } from '../../utils/dither'
import { CITIES } from '../../utils/cities'

export function updateCityButtons() {
  document.querySelectorAll<HTMLButtonElement>('.city-switcher__btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cityIdx !== undefined && CITIES[Number(btn.dataset.cityIdx)] === activeCity)
  })
}

export function registerPhoneEvents() {
  // Populate city switcher buttons
  const cityRow = document.getElementById('city-switcher')
  if (cityRow) {
    CITIES.forEach((city, i) => {
      const btn = document.createElement('button')
      btn.className = 'city-switcher__btn'
      btn.dataset.cityIdx = String(i)
      btn.dataset.cityName = city.name
      btn.textContent = city.shortLabel
      btn.title = city.name
      btn.onclick = () => (window as any).switchCity(i)
      cityRow.appendChild(btn)
    })
  }

  ;(window as any).switchCity = async (idx: number) => {
    const city = CITIES[idx]
    if (!city || city === activeCity) return
    setActiveCity(city)
    updateCityButtons()
    invalidateMapCache()
    setStationPage(0)
    await refreshData(true)
    if (appState === 'detail') await updateDetailInPlace()
  }

  ;(window as any).switchTab = (tab: string) => {
    document.querySelectorAll('.tabs__panel').forEach((el) => {
      (el as HTMLElement).style.display = 'none'
    })
    document.querySelectorAll('.tabs__btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab)
    })
    const panel = document.getElementById(`tab-${tab}`)
    if (panel) panel.style.display = 'block'
  }

  ;(window as any).phoneToggleMode = async (mode: ViewMode) => {
    if (mode === viewMode) return
    setViewMode(mode)
    updatePhoneUI()
    if (appState === 'detail') await updateDetailInPlace()
  }

  ;(window as any).phoneMoreStations = async () => {
    if (stationPage >= maxPage()) return
    setStationPage(stationPage + 1)
    invalidateMapCache()
    updatePhoneUI()
    if (appState === 'detail') await updateDetailInPlace()
  }

  ;(window as any).phonePrevStations = async () => {
    if (stationPage <= 0) return
    setStationPage(stationPage - 1)
    invalidateMapCache()
    updatePhoneUI()
    if (appState === 'detail') await updateDetailInPlace()
  }

  ;(window as any).phoneRefresh = async () => {
    const btn = document.getElementById('btn-refresh')
    if (btn) btn.setAttribute('disabled', 'true')
    await refreshData(true)
    if (btn) btn.removeAttribute('disabled')
  }

  async function applyPhoneMapSettings() {
    invalidateMapCache()
    if (appState === 'detail') await updateDetailInPlace()
  }

  document.getElementById('slider-brightness')?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-brightness')
    if (el) el.textContent = (v / 100).toFixed(2)
    setPhoneBrightness(v)
    applyPhoneMapSettings()
  })

  document.getElementById('slider-contrast')?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-contrast')
    if (el) el.textContent = (v / 100).toFixed(2)
    setPhoneContrast(v)
    applyPhoneMapSettings()
  })

  document.getElementById('phone-invert')?.addEventListener('change', (e) => {
    setPhoneInvert((e.target as HTMLInputElement).checked)
    applyPhoneMapSettings()
  })

  // Populate phone dither select
  const phoneDitherSelect = document.getElementById('phone-dither') as HTMLSelectElement | null
  if (phoneDitherSelect) {
    DITHER_MODES.forEach(({ value, label }) => {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = label
      if (value === 'threshold') opt.selected = true
      phoneDitherSelect.appendChild(opt)
    })
  }

  document.getElementById('phone-dither')?.addEventListener('change', (e) => {
    setPhoneDitherMode((e.target as HTMLSelectElement).value as DitherMode)
    applyPhoneMapSettings()
  })

  // Populate glasses dither select
  const ditherSelect = document.getElementById('glasses-dither') as HTMLSelectElement | null
  if (ditherSelect) {
    DITHER_MODES.forEach(({ value, label }) => {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = label
      if (value === 'threshold') opt.selected = true
      ditherSelect.appendChild(opt)
    })
  }

  async function applyGlassesSettings() {
    invalidateMapCache()
    if (appState === 'detail') await updateDetailInPlace()
  }

  document.getElementById('glasses-brightness')?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-glasses-brightness')
    if (el) el.textContent = String(v)
    setGlassesBrightness(v)
    applyGlassesSettings()
  })

  document.getElementById('glasses-contrast')?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-glasses-contrast')
    if (el) el.textContent = String(v)
    setGlassesContrast(v)
    applyGlassesSettings()
  })

  document.getElementById('glasses-dither')?.addEventListener('change', (e) => {
    setGlassesDitherMode((e.target as HTMLSelectElement).value as DitherMode)
    applyGlassesSettings()
  })

  document.getElementById('slider-gps-interval')?.addEventListener('input', (e) => {
    const secs = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-gps-interval')
    if (el) el.textContent = `${secs}s`
    setGpsUpdateMs(secs * 1000)
    restartTimers()
  })

  document.getElementById('slider-list-interval')?.addEventListener('input', (e) => {
    const secs = Number((e.target as HTMLInputElement).value)
    const el = document.getElementById('val-list-interval')
    if (el) el.textContent = `${secs}s`
    setRefreshMs(secs * 1000)
    restartTimers()
  })

  ;(window as any).resetSettings = async () => {
    // Phone map
    setPhoneBrightness(DEFAULT_PHONE_BRIGHTNESS)
    setPhoneContrast(DEFAULT_PHONE_CONTRAST)
    setPhoneDitherMode(DEFAULT_PHONE_DITHER)
    setPhoneInvert(DEFAULT_PHONE_INVERT)
    const sb = document.getElementById('slider-brightness') as HTMLInputElement | null
    const sc = document.getElementById('slider-contrast') as HTMLInputElement | null
    const pd = document.getElementById('phone-dither') as HTMLSelectElement | null
    const pi = document.getElementById('phone-invert') as HTMLInputElement | null
    if (sb) { sb.value = String(DEFAULT_PHONE_BRIGHTNESS); document.getElementById('val-brightness')!.textContent = (DEFAULT_PHONE_BRIGHTNESS / 100).toFixed(2) }
    if (sc) { sc.value = String(DEFAULT_PHONE_CONTRAST); document.getElementById('val-contrast')!.textContent = (DEFAULT_PHONE_CONTRAST / 100).toFixed(2) }
    if (pd) pd.value = DEFAULT_PHONE_DITHER
    if (pi) pi.checked = DEFAULT_PHONE_INVERT
    // Glasses map
    setGlassesBrightness(DEFAULT_GLASSES_BRIGHTNESS)
    setGlassesContrast(DEFAULT_GLASSES_CONTRAST)
    setGlassesDitherMode(DEFAULT_GLASSES_DITHER)
    const gb = document.getElementById('glasses-brightness') as HTMLInputElement | null
    const gc = document.getElementById('glasses-contrast') as HTMLInputElement | null
    const gd = document.getElementById('glasses-dither') as HTMLSelectElement | null
    if (gb) { gb.value = String(DEFAULT_GLASSES_BRIGHTNESS); document.getElementById('val-glasses-brightness')!.textContent = String(DEFAULT_GLASSES_BRIGHTNESS) }
    if (gc) { gc.value = String(DEFAULT_GLASSES_CONTRAST); document.getElementById('val-glasses-contrast')!.textContent = String(DEFAULT_GLASSES_CONTRAST) }
    if (gd) gd.value = DEFAULT_GLASSES_DITHER
    // Refresh intervals
    setGpsUpdateMs(DEFAULT_GPS_UPDATE_MS)
    setRefreshMs(DEFAULT_REFRESH_MS)
    const gi = document.getElementById('slider-gps-interval') as HTMLInputElement | null
    const li = document.getElementById('slider-list-interval') as HTMLInputElement | null
    if (gi) { gi.value = String(DEFAULT_GPS_UPDATE_MS / 1000); document.getElementById('val-gps-interval')!.textContent = `${DEFAULT_GPS_UPDATE_MS / 1000}s` }
    if (li) { li.value = String(DEFAULT_REFRESH_MS / 1000); document.getElementById('val-list-interval')!.textContent = `${DEFAULT_REFRESH_MS / 1000}s` }
    restartTimers()
    // Re-render both
    invalidateMapCache()
    if (appState === 'detail') await updateDetailInPlace()
  }

  setInterval(() => {
    const el = document.getElementById('refresh-timer')
    if (!el) return
    if (stationPage !== 0) {
      el.textContent = 'Refresh paused'
      el.setAttribute('data-paused', 'true')
      return
    }
    el.removeAttribute('data-paused')
    const t = getLastRefreshMs()
    const secsLeft = t === 0 ? REFRESH_MS / 1000 : Math.max(0, Math.round((REFRESH_MS - (Date.now() - t)) / 1000))
    el.textContent = secsLeft === 0 ? 'Refreshing...' : `Refreshes in ${secsLeft}s`
  }, 1000)
}
