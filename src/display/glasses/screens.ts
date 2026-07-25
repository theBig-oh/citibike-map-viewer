import {
  TextContainerProperty,
  TextContainerUpgrade,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
} from '@evenrealities/even_hub_sdk'
import {
  viewMode, stations, controlsCursor, userLat, userLon,
  setAppState, setViewMode, setControlsCursor,
  TILE_W, FULL_W, FULL_H, CTRL_H, MAP_W, MAP_H,
  stationPage, PAGE_SIZE, zoomForPage, maxPage, activeCity,
} from '../../state'
import type { ControlIdx, ViewMode } from '../../types'
import { getMapPng } from '../../utils/map'
import { updatePhoneUI } from '../phone/phoneUI'
import { splashText } from './splash'

let bridgeRef: any = null
export function setScreensBridge(b: any) { bridgeRef = b }

async function waitBridgeReady() {
  let n = 0
  while (!(bridgeRef as any).ready) {
    await new Promise(r => setTimeout(r, 100))
    n++
    if (n % 10 === 0) console.log(`waiting for bridge.ready (${n * 100}ms)`)
  }
}

export function menuText(cursor: ControlIdx): string {
  const items = ['Bikes Available', 'Docks Available', 'Exit']
  const cityLine = activeCity ? activeCity.name : 'Bikeshare Nearby'
  const lines = [cityLine, '----------------']
  items.forEach((label, i) => {
    lines.push(i === cursor ? `> ${label}` : `  ${label}`)
  })
  lines.push('', 'swipe: move  |  press: select')
  return lines.join('\n')
}

export function detailListText(mode: ViewMode): string {
  const modeLabel = mode === 'available' ? 'Bikes Available' : 'Docks Available'
  const lines: string[] = [modeLabel]
  if (stations.length === 0) {
    lines.push('No stations nearby')
  } else {
    const offset = stationPage * PAGE_SIZE
    stations.forEach((s, i) => {
      const dist = s.distanceM < 1000
        ? `${Math.round(s.distanceM)}m`
        : `${(s.distanceM / 1000).toFixed(1)}km`
      const name = s.name.length > 18 ? s.name.slice(0, 16) + '..' : s.name
      lines.push(`${offset + i + 1}. ${name}`)
      if (mode === 'available') {
        const classic = s.bikes - s.ebikes
        lines.push(`   ${dist}  Classic:${classic} | E-bike:${s.ebikes}`)
      } else {
        lines.push(`   ${dist}  Docks:${s.docks}`)
      }
    })
  }
  return lines.join('\n')
}

export function detailCtrlText(): string {
  const prev = stationPage > 0 ? 'Swipe ↑ Prev ||' : '      '
  const next = stationPage < maxPage() ? 'Swipe ↓ Next ||' : '      '
  return `${prev} ${next} Press: Back to Menu`
}

export async function showSplash() {
  setAppState('splash')
  await waitBridgeReady()
  const result = await bridgeRef.createStartUpPageContainer(
    CreateStartUpPageContainer.fromJson({
      containerTotalNum: 1,
      textObject: [{
        xPosition: 0, yPosition: 0, width: FULL_W, height: FULL_H,
        borderWidth: 0, borderColor: 0, paddingLength: 20,
        containerID: 1, containerName: 'evtlayer',
        content: splashText(0, 'Starting...'), isEventCapture: 1,
      }],
    })
  )
  console.log('createStartUpPageContainer result:', result)
  if (result !== 0) { console.error('STARTUP FAILED result=' + result); return }
  updatePhoneUI()
}

export async function showMenu() {
  setAppState('menu')
  await waitBridgeReady()
  const ok = await bridgeRef.rebuildPageContainer(
    RebuildPageContainer.fromJson({
      containerTotalNum: 1,
      textObject: [{
        xPosition: 0, yPosition: 0, width: FULL_W, height: FULL_H,
        borderWidth: 0, borderColor: 0, paddingLength: 16,
        containerID: 1, containerName: 'evtlayer',
        content: menuText(controlsCursor), isEventCapture: 1,
      }],
    })
  )
  console.log('showMenu rebuild:', ok)
  updatePhoneUI()
}

export async function showDetail(mode: ViewMode) {
  setAppState('detail')
  setViewMode(mode)
  setControlsCursor(0)
  await waitBridgeReady()
  const ok = await bridgeRef.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 3,
      textObject: [
        new TextContainerProperty({
          xPosition: 0, yPosition: 0, width: TILE_W, height: FULL_H - CTRL_H,
          borderWidth: 0, borderColor: 0, paddingLength: 8,
          containerID: 1, containerName: 'evtlayer',
          content: detailListText(viewMode), isEventCapture: 1,
        }),
        new TextContainerProperty({
          xPosition: 0, yPosition: FULL_H - CTRL_H, width: FULL_W, height: CTRL_H,
          borderWidth: 0, borderColor: 0, paddingLength: 4,
          containerID: 6, containerName: 'ctrls',
          content: detailCtrlText(), isEventCapture: 0,
        }),
      ],
      imageObject: [
        new ImageContainerProperty({
          xPosition: TILE_W, yPosition: 40, width: MAP_W, height: MAP_H,
          containerID: 7, containerName: 'map',
        }),
      ],
    })
  )
  console.log('showDetail rebuild:', ok)
  const zoom = zoomForPage(stationPage)
  const { png, phoneDataUrl } = await getMapPng(stations, userLat, userLon, zoom, stationPage * PAGE_SIZE)
  console.log('map png size:', png.length, 'bytes')
  const imgResult = await bridgeRef.updateImageRawData(new ImageRawDataUpdate({
    containerID: 7, containerName: 'map', imageData: png,
  }))
  console.log('updateImageRawData result:', imgResult)
  updatePhoneUI(phoneDataUrl)
}

export async function updateDetailInPlace() {
  const list = detailListText(viewMode)
  const ctrl = detailCtrlText()
  await bridgeRef.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'evtlayer', contentOffset: 0, contentLength: 0, content: list }))
  await bridgeRef.textContainerUpgrade(new TextContainerUpgrade({ containerID: 6, containerName: 'ctrls', contentOffset: 0, contentLength: 0, content: ctrl }))
  const zoom = zoomForPage(stationPage)
  const { png, phoneDataUrl } = await getMapPng(stations, userLat, userLon, zoom, stationPage * PAGE_SIZE)
  await bridgeRef.updateImageRawData(new ImageRawDataUpdate({ containerID: 7, containerName: 'map', imageData: png }))
  updatePhoneUI(phoneDataUrl)
}

export async function showNoService() {
  setAppState('no-service')
  await waitBridgeReady()
  await bridgeRef.rebuildPageContainer(
    RebuildPageContainer.fromJson({
      containerTotalNum: 1,
      textObject: [{
        xPosition: 0, yPosition: 0, width: FULL_W, height: FULL_H,
        borderWidth: 0, borderColor: 0, paddingLength: 20,
        containerID: 1, containerName: 'evtlayer',
        content: 'No bikeshare service\nin your area.\n\nSupported cities:\nNew York / NJ\nChicago\nSF / Bay Area\nWashington DC\nBoston\nColumbus',
        isEventCapture: 1,
      }],
    })
  )
  updatePhoneUI()
}

export async function updateMenuInPlace() {
  await bridgeRef.textContainerUpgrade(new TextContainerUpgrade({
    containerID: 1, containerName: 'evtlayer',
    contentOffset: 0, contentLength: 0,
    content: menuText(controlsCursor),
  }))
  updatePhoneUI()
}
