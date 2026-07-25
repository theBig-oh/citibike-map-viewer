import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import './style.scss'

import { setGeoBridge, getUserLocation, fetchStations } from './utils/geo'
import { prefetchMapTiles } from './utils/map'
import { setScreensBridge, showSplash, showDetail } from './display/glasses/screens'
import { setSplashBridge, updateSplashProgress } from './display/glasses/splash'
import { setEventsBridge, registerGlassesEvents } from './display/glasses/events'
import { showPhoneLoading } from './display/phone/phoneUI'
import { registerPhoneEvents } from './display/phone/phoneEvents'
import {
  setUserLat, setUserLon, setAllStations, setControlsCursor, setViewMode,
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

showPhoneLoading(true)
await showSplash()

await updateSplashProgress(10, 'Getting location...')
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

await updateSplashProgress(35, 'Fetching stations...')
try {
  const s = await fetchStations(userLat, userLon)
  setAllStations(s)
  console.log(`boot: fetched ${s.length} stations`)
} catch (e) {
  console.error('Station fetch failed:', e)
}
await updateSplashProgress(50, 'Stations ready')

await updateSplashProgress(60, 'Loading map tiles...')
await prefetchMapTiles(userLat, userLon)
await updateSplashProgress(75, 'Map tiles cached')

await updateSplashProgress(90, 'Rendering map...')
await updateSplashProgress(100, 'Ready!')
await new Promise(r => setTimeout(r, 400))

showPhoneLoading(false)

setControlsCursor(0)
setViewMode('available')
console.log('boot: going straight to detail')
await showDetail('available')
console.log('boot: done')

registerGlassesEvents()
