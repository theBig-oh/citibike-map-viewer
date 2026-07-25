export interface CityConfig {
  name: string
  shortLabel: string
  stationInfoUrl: string
  stationStatusUrl: string
  // bounding box: [minLat, maxLat, minLon, maxLon]
  bounds: [number, number, number, number]
}

export const CITIES: CityConfig[] = [
  {
    name: 'New York / New Jersey',
    shortLabel: 'NYC',
    stationInfoUrl: 'https://gbfs.citibikenyc.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json',
    bounds: [40.4, 41.0, -74.3, -73.7],
  },
  {
    name: 'Chicago',
    shortLabel: 'CHI',
    stationInfoUrl: 'https://gbfs.divvybikes.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.divvybikes.com/gbfs/en/station_status.json',
    bounds: [41.6, 42.1, -87.9, -87.5],
  },
  {
    name: 'San Francisco / Bay Area',
    shortLabel: 'SF',
    stationInfoUrl: 'https://gbfs.baywheels.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.baywheels.com/gbfs/en/station_status.json',
    bounds: [37.2, 38.0, -122.6, -121.9],
  },
  {
    name: 'Washington DC',
    shortLabel: 'DC',
    stationInfoUrl: 'https://gbfs.capitalbikeshare.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.capitalbikeshare.com/gbfs/en/station_status.json',
    bounds: [38.7, 39.1, -77.3, -76.8],
  },
  {
    name: 'Boston',
    shortLabel: 'BOS',
    stationInfoUrl: 'https://gbfs.bluebikes.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.bluebikes.com/gbfs/en/station_status.json',
    bounds: [42.2, 42.5, -71.3, -70.9],
  },
  {
    name: 'Columbus',
    shortLabel: 'CMH',
    stationInfoUrl: 'https://gbfs.cogobikeshare.com/gbfs/en/station_information.json',
    stationStatusUrl: 'https://gbfs.cogobikeshare.com/gbfs/en/station_status.json',
    bounds: [39.9, 40.1, -83.1, -82.9],
  },
]

export function detectCity(lat: number, lon: number): CityConfig | null {
  return CITIES.find(
    c => lat >= c.bounds[0] && lat <= c.bounds[1] && lon >= c.bounds[2] && lon <= c.bounds[3]
  ) ?? null
}
