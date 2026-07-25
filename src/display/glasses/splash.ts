import { TextContainerUpgrade } from '@evenrealities/even_hub_sdk'
import { updatePhoneProgress } from '../phone/phoneUI'

let bridgeRef: any = null
export function setSplashBridge(b: any) { bridgeRef = b }

export function splashText(pct: number, label: string): string {
  const BAR = 20
  const filled = Math.round(pct / 100 * BAR)
  const bar = '█'.repeat(filled) + '░'.repeat(BAR - filled)
  return `CitiBike Nearby\n\n${bar}\n${pct}%  ${label}`
}

export async function updateSplashProgress(pct: number, label: string) {
  await bridgeRef.textContainerUpgrade(new TextContainerUpgrade({
    containerID: 1, containerName: 'evtlayer',
    contentOffset: 0, contentLength: 0,
    content: splashText(pct, label),
  }))
  updatePhoneProgress(pct, label)
}
