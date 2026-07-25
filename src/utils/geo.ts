import { AppLocationAccuracy } from '@evenrealities/even_hub_sdk'
import type { NearbyStation, StationInfo, StationStatus } from '../types'
import { FALLBACK_LAT, FALLBACK_LON, MAX_FETCH, getStationInfoUrl, getStationStatusUrl } from '../state'

let bridgeRef: any = null
export function setGeoBridge(b: any) { bridgeRef = b }

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  if (bridgeRef) {
    try {
      const result = await bridgeRef.getAppLocation({ accuracy: AppLocationAccuracy.Medium })
      console.log('getAppLocation result:', JSON.stringify(result))
      if (result && typeof result.latitude === 'number' && typeof result.longitude === 'number') {
        console.log(`GPS (SDK): ${result.latitude}, ${result.longitude} accuracy:${result.accuracy}m`)
        return { lat: result.latitude, lon: result.longitude }
      }
      console.warn('getAppLocation returned null, falling back')
    } catch (e) {
      console.warn('getAppLocation failed:', (e as Error).message)
    }
  }

  if (!navigator.geolocation) {
    console.warn('geolocation not available, using fallback')
    return { lat: FALLBACK_LAT, lon: FALLBACK_LON }
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log(`GPS (browser): ${pos.coords.latitude}, ${pos.coords.longitude} (accuracy: ${pos.coords.accuracy}m)`)
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      (err) => {
        console.warn(`GPS error ${err.code}: ${err.message}, using fallback`)
        resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON })
      },
      { timeout: 15000, maximumAge: 30000, enableHighAccuracy: false }
    )
  })
}

export async function fetchStations(lat: number, lon: number): Promise<NearbyStation[]> {
  const [infoRes, statusRes] = await Promise.all([
    fetch(getStationInfoUrl()),
    fetch(getStationStatusUrl()),
  ])
  const infoData = await infoRes.json()
  const statusData = await statusRes.json()

  const statusMap = new Map<string, StationStatus>()
  for (const s of statusData.data.stations as StationStatus[]) {
    statusMap.set(s.station_id, s)
  }

  return (infoData.data.stations as StationInfo[])
    .map((info) => {
      const status = statusMap.get(info.station_id)
      if (!status || !status.is_installed || !status.is_renting) return null
      return {
        name: info.name,
        distanceM: haversineM(lat, lon, info.lat, info.lon),
        bikes: status.num_bikes_available,
        ebikes: status.num_ebikes_available,
        docks: status.num_docks_available,
        lat: info.lat,
        lon: info.lon,
      }
    })
    .filter((s): s is NearbyStation => s !== null)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_FETCH)
}
