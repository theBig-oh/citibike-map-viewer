import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import './style.scss'

import { setGeoBridge, getUserLocation, fetchStations } from './utils/geo'
import { prefetchMapTiles } from './utils/map'
import { setScreensBridge, showSplash, showDetail } from './display/glasses/screens'
import { setSplashBridge, updateSplashProgress } from './display/glasses/splash'
import { setEventsBridge, registerGlassesEvents } from './display/glasses/events'
import { showPhoneLoading } from './display/phone/phoneUI'
import { registerPhoneEvents } from './display/phone/phoneEvents'
import { detectCity } from './utils/cities'
import {
  setUserLat, setUserLon, setAllStations, setControlsCursor, setViewMode, setActiveCity,
  userLat, userLon, FALLBACK_LAT, FALLBACK_LON,
} from './state'

const bridge = await waitForEvenAppBridge()

setGeoBridge(bridge)
setScreensBridge(bridge)
setSplashBridge(bridge)
setEventsBridge(bridge)

registerPhoneEvents()

// ── Wait for glasses connection ───────────────────────────────────────────────

console.log('boot: waiting for glasses connection')
await new Promise<void>(resolve => {
  bridge.getDeviceInfo().then((info: any) => {
    console.log('boot: device info:', JSON.stringify(info))
    if (info?.status?.isConnected()) { resolve(); return }
    const unsub = bridge.onDeviceStatusChanged((status: any) => {
      if (status.isConnected()) { unsub(); resolve() }
    })
  })
})
console.log('boot: glasses connected')

const devInfo = await bridge.getDeviceInfo()
console.log('device model:', devInfo?.model, 'battery:', devInfo?.status?.batteryLevel)

await new Promise(r => setTimeout(r, 2000))

// ── Boot sequence with progress ───────────────────────────────────────────────

const MIN_LOADING_MS = 3000
const STEP_DELAY_MS = 300
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const bootStart = Date.now()
showPhoneLoading(true)
await showSplash()

await updateSplashProgress(10, 'Getting location...')
await sleep(STEP_DELAY_MS)
try {
  const loc = await getUserLocation()
  setUserLat(loc.lat)
  setUserLon(loc.lon)
  console.log(`boot: location ${loc.lat}, ${loc.lon}`)
} catch {
  console.warn('GPS failed, using fallback')
  setUserLat(FALLBACK_LAT)
  setUserLon(FALLBACK_LON)
}
await updateSplashProgress(25, 'Location ready')
await sleep(STEP_DELAY_MS)

const city = detectCity(userLat, userLon)
setActiveCity(city)

await updateSplashProgress(35, 'Fetching stations...')
await sleep(STEP_DELAY_MS)
if (city) {
  try {
    const s = await fetchStations(userLat, userLon)
    setAllStations(s)
    console.log(`boot: fetched ${s.length} stations`)
  } catch (e) {
    console.error('Station fetch failed:', e)
  }
} else {
  console.warn('boot: no bikeshare city detected at', userLat, userLon)
}
await updateSplashProgress(50, 'Stations ready')
await sleep(STEP_DELAY_MS)

await updateSplashProgress(60, 'Loading map tiles...')
await sleep(STEP_DELAY_MS)
await prefetchMapTiles(userLat, userLon)
await updateSplashProgress(75, 'Map tiles cached')
await sleep(STEP_DELAY_MS)

await updateSplashProgress(90, 'Rendering map...')
await sleep(STEP_DELAY_MS)
await updateSplashProgress(100, 'Ready!')

// Keep the splash up for a minimum duration so the hint text is readable,
// regardless of how fast the network calls above actually finished.
const remaining = MIN_LOADING_MS - (Date.now() - bootStart)
if (remaining > 0) await sleep(remaining)

showPhoneLoading(false)

setControlsCursor(0)
setViewMode('available')
console.log('boot: going straight to detail')
await showDetail('available')
console.log('boot: done')

registerGlassesEvents()
