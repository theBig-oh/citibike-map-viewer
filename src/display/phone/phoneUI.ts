import { stations, viewMode, stationPage, maxPage, phoneDitherMode, phoneBrightness, phoneContrast, phoneInvert, activeCity } from '../../state'
import { applyDitherToGrey } from '../../utils/dither'

export function updatePhoneUI(mapDataUrl?: string) {
  if (mapDataUrl) {
    const placeholder = document.getElementById('map-placeholder')
    const canvas = document.getElementById('map-canvas-phone') as HTMLCanvasElement | null
    if (placeholder) placeholder.style.display = 'none'
    if (canvas) {
      canvas.style.display = 'block'
      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        if (phoneBrightness !== 100 || phoneContrast !== 100 || phoneDitherMode !== 'threshold' || phoneInvert) {
          const W = canvas.width, H = canvas.height
          const imgData = ctx.getImageData(0, 0, W, H)
          const pixels = imgData.data
          const pc = W * H
          const grey = new Float32Array(pc)
          const brightnessF = phoneBrightness / 100   // 0→0.0, 100→1.0, 200→2.0
          const contrastF = phoneContrast / 100
          for (let i = 0; i < pc; i++) {
            const si = i * 4
            let lum = 0.299 * pixels[si]! + 0.587 * pixels[si + 1]! + 0.114 * pixels[si + 2]!
            lum = lum * brightnessF
            lum = (lum - 128) * contrastF + 128
            if (phoneInvert) lum = 255 - lum
            grey[i] = Math.max(0, Math.min(255, lum))
          }
          applyDitherToGrey(grey, W, H, phoneDitherMode)
          for (let i = 0; i < pc; i++) {
            const v = Math.max(0, Math.min(255, Math.round(grey[i]!)))
            const si = i * 4
            pixels[si] = v; pixels[si + 1] = v; pixels[si + 2] = v
          }
          ctx.putImageData(imgData, 0, 0)
        }
      }
      img.src = mapDataUrl
    }
  }

  const btnAvail = document.getElementById('btn-available')
  const btnDocked = document.getElementById('btn-docked')
  if (btnAvail && btnDocked) {
    btnAvail.classList.toggle('active', viewMode === 'available')
    btnDocked.classList.toggle('active', viewMode === 'docked')
  }

  document.querySelectorAll<HTMLButtonElement>('.city-switcher__btn').forEach(btn => {
    btn.classList.toggle('active', !!activeCity && btn.dataset.cityName === activeCity.name)
  })

  const listEl = document.getElementById('station-list')
  const noEl = document.getElementById('no-stations')
  if (!listEl) return

  listEl.querySelectorAll('.station-card').forEach(el => el.remove())

  if (stations.length === 0) {
    if (noEl) noEl.style.display = 'block'
    return
  }
  if (noEl) noEl.style.display = 'none'

  const prevBtn = document.getElementById('btn-prev-stations')
  const moreBtn = document.getElementById('btn-more-stations')
  if (prevBtn) prevBtn.style.display = stationPage > 0 ? 'block' : 'none'
  if (moreBtn) moreBtn.style.display = stationPage < maxPage() ? 'block' : 'none'

  const offset = stationPage * 3
  stations.forEach((s, i) => {
    const dist = s.distanceM < 1000
      ? `${Math.round(s.distanceM)}m away`
      : `${(s.distanceM / 1000).toFixed(1)}km away`

    let countMain: string
    let countSub: string
    let countDetail: string

    if (viewMode === 'available') {
      const classic = s.bikes - s.ebikes
      countMain = String(s.bikes)
      countSub = 'bikes'
      countDetail = `Classics:${classic} E-Bikes:${s.ebikes}`
    } else {
      countMain = String(s.docks)
      countSub = 'docks'
      countDetail = ''
    }

    const card = document.createElement('div')
    card.className = 'station-card'
    card.innerHTML = `
      <div class="station-card__num">${offset + i + 1}</div>
      <div class="station-card__info">
        <div class="station-card__name">${s.name}</div>
        <div class="station-card__meta">${dist}</div>
      </div>
      <div class="station-card__count">
        <div class="station-card__count-main">${countMain}</div>
        <div class="station-card__count-sub">${countSub}</div>
        ${countDetail ? `<div class="station-card__count-detail">${countDetail}</div>` : ''}
      </div>
    `
    listEl.appendChild(card)
  })
}

let progressCurrentPct = 0
let progressTargetPct = 0
let progressRafId: number | null = null

function stepProgressAnimation() {
  const diff = progressTargetPct - progressCurrentPct
  progressCurrentPct += Math.abs(diff) < 0.15 ? diff : diff * 0.12
  const bar = document.getElementById('phone-progress-bar')
  if (bar) (bar as HTMLElement).style.width = `${progressCurrentPct}%`
  progressRafId = Math.abs(progressTargetPct - progressCurrentPct) > 0.15
    ? requestAnimationFrame(stepProgressAnimation)
    : null
}

export function showPhoneLoading(visible: boolean) {
  const loading = document.getElementById('phone-loading')
  const main = document.getElementById('phone-ui')
  if (loading) loading.style.display = visible ? 'flex' : 'none'
  if (main) main.style.display = visible ? 'none' : 'block'
  if (visible) {
    if (progressRafId !== null) cancelAnimationFrame(progressRafId)
    progressRafId = null
    progressCurrentPct = 0
    progressTargetPct = 0
    const bar = document.getElementById('phone-progress-bar')
    if (bar) (bar as HTMLElement).style.width = '0%'
  }
}

export function updatePhoneProgress(pct: number, label: string) {
  progressTargetPct = pct
  if (progressRafId === null) progressRafId = requestAnimationFrame(stepProgressAnimation)
  const lbl = document.getElementById('phone-progress-label')
  if (lbl) lbl.textContent = label
}
