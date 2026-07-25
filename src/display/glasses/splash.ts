import { TextContainerUpgrade } from '@evenrealities/even_hub_sdk'
import { updatePhoneProgress } from '../phone/phoneUI'

let bridgeRef: any = null
export function setSplashBridge(b: any) { bridgeRef = b }

export function splashText(pct: number, label: string): string {
  const BAR = 20
  const filled = Math.round(pct / 100 * BAR)
  const bar = '█'.repeat(filled) + '░'.repeat(BAR - filled)
  return `CitiBike Nearby\n\n${bar}\n${Math.round(pct)}%  ${label}\n\nMore settings/controls avail through phone`
}

let displayedPct = 0

async function pushSplashFrame(pct: number, label: string) {
  await bridgeRef.textContainerUpgrade(new TextContainerUpgrade({
    containerID: 1, containerName: 'evtlayer',
    contentOffset: 0, contentLength: 0,
    content: splashText(pct, label),
  }))
}

// Interpolates the bar through eased intermediate frames instead of jumping
// straight to `pct`, since the glasses only render discrete text redraws.
export async function updateSplashProgress(pct: number, label: string) {
  const FRAMES = 20
  const FRAME_MS = 25
  const start = displayedPct
  const diff = pct - start

  for (let i = 1; i <= FRAMES; i++) {
    const t = i / FRAMES
    const eased = 1 - (1 - t) * (1 - t) // ease-out quad
    const cur = start + diff * eased
    await pushSplashFrame(cur, label)
    if (i < FRAMES) await new Promise(r => setTimeout(r, FRAME_MS))
  }
  displayedPct = pct
  updatePhoneProgress(pct, label)
}
