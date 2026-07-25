export type ViewMode = 'available' | 'docked'
export type AppState = 'splash' | 'menu' | 'detail' | 'no-service'
export type ControlIdx = 0 | 1 | 2

export interface StationInfo {
  station_id: string
  name: string
  lat: number
  lon: number
}

export interface StationStatus {
  station_id: string
  num_bikes_available: number
  num_ebikes_available: number
  num_docks_available: number
  is_installed: number
  is_renting: number
}

export interface NearbyStation {
  name: string
  distanceM: number
  bikes: number
  ebikes: number
  docks: number
  lat: number
  lon: number
}
