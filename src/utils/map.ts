import UPNG from 'upng-js'
import type { NearbyStation } from '../types'
import { MAP_H, MAP_W, MAP_ZOOM_BASE, glassesBrightness, glassesContrast, glassesDitherMode } from '../state'
import { applyDitherToGrey } from './dither'

export const TILE_URL = (z: number, x: number, y: number) =>
  `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}.png`

export function latLonToTile(lat: number, lon: number, z: number): { tx: number; ty: number; px: number; py: number } {
  const n = Math.pow(2, z)
  const tx = Math.floor((lon + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const ty = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  const px = Math.floor(((lon + 180) / 360 * n - tx) * 256)
  const py = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n - ty) * 256)
  return { tx, ty, px, py }
}

export function canvasToGreyscalePng(canvas: HTMLCanvasElement): { png: Uint8Array; dataUrl: string } {
  const W = canvas.width, H = canvas.height 
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.getImageData(0, 0, W, H)
  const pixels = imgData.data
  const pc = W * H

  const grey = new Float32Array(pc)
  const contrastF = (glassesContrast + 100) / 100
  for (let i = 0; i < pc; i++) {
    const si = i * 4
    let lum = 0.299 * pixels[si]! + 0.587 * pixels[si + 1]! + 0.114 * pixels[si + 2]!
    lum = lum + glassesBrightness
    lum = (lum - 128) * contrastF + 128
    grey[i] = Math.max(0, Math.min(255, lum))
  }

  applyDitherToGrey(grey, W, H, glassesDitherMode)

  const rgba = new Uint8Array(pc * 4)
  for (let i = 0; i < pc; i++) {
    const v = Math.max(0, Math.min(255, Math.round(grey[i]!))) 
    const si = i * 4
    rgba[si] = v; rgba[si + 1] = v; rgba[si + 2] = v; rgba[si + 3] = 255
  }
  const pngBuf = UPNG.encode([rgba.buffer.slice(0, pc * 4) as ArrayBuffer], W, H, 16)

  for (let i = 0; i < pc; i++) {
    const v = Math.max(0, Math.min(255, Math.round(grey[i]!)))
    const si = i * 4
    pixels[si] = v; pixels[si + 1] = v; pixels[si + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)

  return { png: new Uint8Array(pngBuf), dataUrl: canvas.toDataURL('image/png') }
}

export async function renderMapCanvas(stations: NearbyStation[], uLat: number, uLon: number, zoom = MAP_ZOOM_BASE, dotOffset = 0): Promise<{ png: Uint8Array; dataUrl: string; phoneDataUrl: string }> {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, MAP_W, MAP_H)

  const { tx, ty, px, py } = latLonToTile(uLat, uLon, zoom)
  const TILE = 256
  const COLS = 3, ROWS = 3
  const startTx = tx - Math.floor(COLS / 2)
  const startTy = ty - 1
  const originX = MAP_W / 2 - px - (tx - startTx) * TILE
  const originY = MAP_H / 2 - py - (ty - startTy) * TILE

  const fetchTile = async (col: number, row: number): Promise<void> => {
    const url = TILE_URL(zoom, startTx + col, startTy + row)
    const dx = originX + col * TILE
    const dy = originY + row * TILE
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`tile ${r.status}`)
      const blob = await r.blob()
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, dx, dy, TILE, TILE); resolve() }
        img.onerror = () => { ctx.fillStyle = '#000'; ctx.fillRect(dx, dy, TILE, TILE); resolve() }
        img.src = URL.createObjectURL(blob)
      })
    } catch {
      ctx.fillStyle = '#000'
      ctx.fillRect(dx, dy, TILE, TILE)
    }
  }

  const tilePromises: Promise<void>[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tilePromises.push(fetchTile(col, row))
    }
  }
  await Promise.all(tilePromises)

  const toX = (lon: number) => MAP_W / 2 + (lon - uLon) * (TILE * Math.pow(2, zoom)) / 360
  const toY = (lat: number) => {
    const latRad = lat * Math.PI / 180
    const uLatRad = uLat * Math.PI / 180
    const mercLat = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    const mercULat = Math.log(Math.tan(Math.PI / 4 + uLatRad / 2))
    return MAP_H / 2 - (mercLat - mercULat) * (TILE * Math.pow(2, zoom)) / (2 * Math.PI)
  }

  const ux = toX(uLon), uy = toY(uLat)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(ux, uy, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(ux, uy, 4, 0, Math.PI * 2)
  ctx.fill()

  stations.forEach((s, i) => {
    const x = toX(s.lon), y = toY(s.lat)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(dotOffset + i + 1), x, y)
  })
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const phoneDataUrl = canvas.toDataURL('image/png')
  const { png, dataUrl: glassesDataUrl } = canvasToGreyscalePng(canvas)

  return { png, dataUrl: glassesDataUrl, phoneDataUrl }
}

// Cache
let cachedMapPng: Uint8Array | null = null
let cachedMapDataUrl: string | null = null
let cachedMapPhoneDataUrl: string | null = null
let cachedMapLat = NaN
let cachedMapLon = NaN
let cachedMapZoom = NaN
let cachedMapKey = ''
let cachedMapOffset = -1

function stationsKey(stations: NearbyStation[]): string {
  return stations.map(s => `${s.lat},${s.lon}`).join('|')
}

export async function getMapPng(stations: NearbyStation[], lat: number, lon: number, zoom = MAP_ZOOM_BASE, dotOffset = 0): Promise<{ png: Uint8Array; dataUrl: string; phoneDataUrl: string }> {
  const key = stationsKey(stations)
  if (cachedMapPng && cachedMapDataUrl && cachedMapPhoneDataUrl && cachedMapLat === lat && cachedMapLon === lon && cachedMapZoom === zoom && cachedMapKey === key && cachedMapOffset === dotOffset) {
    return { png: cachedMapPng, dataUrl: cachedMapDataUrl, phoneDataUrl: cachedMapPhoneDataUrl }
  }
  const result = await renderMapCanvas(stations, lat, lon, zoom, dotOffset)
  cachedMapPng = result.png
  cachedMapDataUrl = result.dataUrl
  cachedMapPhoneDataUrl = result.phoneDataUrl
  cachedMapLat = lat
  cachedMapLon = lon
  cachedMapZoom = zoom
  cachedMapKey = key
  cachedMapOffset = dotOffset
  return result
}

export function invalidateMapCache() {
  cachedMapPng = null
  cachedMapDataUrl = null
  cachedMapPhoneDataUrl = null
  cachedMapLat = NaN
  cachedMapLon = NaN
  cachedMapZoom = NaN
  cachedMapKey = ''
  cachedMapOffset = -1
}

export async function prefetchMapTiles(lat: number, lon: number) {
  const { tx, ty } = latLonToTile(lat, lon, MAP_ZOOM_BASE)
  const COLS = 3, ROWS = 3
  const startTx = tx - Math.floor(COLS / 2)
  const startTy = ty - 1
  const fetches: Promise<void>[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      fetches.push(fetch(TILE_URL(MAP_ZOOM_BASE, startTx + col, startTy + row)).then(() => {}).catch(() => {}))
    }
  }
  await Promise.all(fetches)
}
