const LEVELS = 16

export type DitherMode =
  | 'floyd-steinberg'
  | 'atkinson'
  | 'jarvis'
  | 'stucki'
  | 'sierra'
  | 'burkes'
  | 'bayer2'
  | 'bayer4'
  | 'bayer8'
  | 'blue-noise'
  | 'halftone'
  | 'threshold'
  | 'random'

export const DITHER_MODES: { value: DitherMode; label: string }[] = [
  { value: 'threshold',       label: 'Threshold' },
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
  { value: 'atkinson',        label: 'Atkinson' },
  { value: 'jarvis',          label: 'Jarvis-Judice-Ninke' },
  { value: 'stucki',          label: 'Stucki' },
  { value: 'sierra',          label: 'Sierra' },
  { value: 'burkes',          label: 'Burkes' },
  { value: 'bayer2',          label: 'Bayer 2×2' },
  { value: 'bayer4',          label: 'Bayer 4×4' },
  { value: 'bayer8',          label: 'Bayer 8×8' },
  { value: 'blue-noise',      label: 'Blue Noise' },
  { value: 'halftone',        label: 'Halftone' },
  { value: 'random',          label: 'Random Noise' },
]

function quantize(val: number): number {
  return Math.round(val / (255 / (LEVELS - 1))) * (255 / (LEVELS - 1))
}

type DiffusionKernel = { dx: number; dy: number; w: number }[]

const KERNEL_FLOYD_STEINBERG: DiffusionKernel = [
  { dx: 1, dy: 0, w: 7 / 16 },
  { dx: -1, dy: 1, w: 3 / 16 },
  { dx: 0, dy: 1, w: 5 / 16 },
  { dx: 1, dy: 1, w: 1 / 16 },
]

const KERNEL_ATKINSON: DiffusionKernel = [
  { dx: 1, dy: 0, w: 1 / 8 },
  { dx: 2, dy: 0, w: 1 / 8 },
  { dx: -1, dy: 1, w: 1 / 8 },
  { dx: 0, dy: 1, w: 1 / 8 },
  { dx: 1, dy: 1, w: 1 / 8 },
  { dx: 0, dy: 2, w: 1 / 8 },
]

const KERNEL_JARVIS: DiffusionKernel = [
  { dx: 1, dy: 0, w: 7 / 48 }, { dx: 2, dy: 0, w: 5 / 48 },
  { dx: -2, dy: 1, w: 3 / 48 }, { dx: -1, dy: 1, w: 5 / 48 }, { dx: 0, dy: 1, w: 7 / 48 }, { dx: 1, dy: 1, w: 5 / 48 }, { dx: 2, dy: 1, w: 3 / 48 },
  { dx: -2, dy: 2, w: 1 / 48 }, { dx: -1, dy: 2, w: 3 / 48 }, { dx: 0, dy: 2, w: 5 / 48 }, { dx: 1, dy: 2, w: 3 / 48 }, { dx: 2, dy: 2, w: 1 / 48 },
]

const KERNEL_STUCKI: DiffusionKernel = [
  { dx: 1, dy: 0, w: 8 / 42 }, { dx: 2, dy: 0, w: 4 / 42 },
  { dx: -2, dy: 1, w: 2 / 42 }, { dx: -1, dy: 1, w: 4 / 42 }, { dx: 0, dy: 1, w: 8 / 42 }, { dx: 1, dy: 1, w: 4 / 42 }, { dx: 2, dy: 1, w: 2 / 42 },
  { dx: -2, dy: 2, w: 1 / 42 }, { dx: -1, dy: 2, w: 2 / 42 }, { dx: 0, dy: 2, w: 4 / 42 }, { dx: 1, dy: 2, w: 2 / 42 }, { dx: 2, dy: 2, w: 1 / 42 },
]

const KERNEL_SIERRA: DiffusionKernel = [
  { dx: 1, dy: 0, w: 5 / 32 }, { dx: 2, dy: 0, w: 3 / 32 },
  { dx: -2, dy: 1, w: 2 / 32 }, { dx: -1, dy: 1, w: 4 / 32 }, { dx: 0, dy: 1, w: 5 / 32 }, { dx: 1, dy: 1, w: 4 / 32 }, { dx: 2, dy: 1, w: 2 / 32 },
  { dx: -1, dy: 2, w: 2 / 32 }, { dx: 0, dy: 2, w: 3 / 32 }, { dx: 1, dy: 2, w: 2 / 32 },
]

const KERNEL_BURKES: DiffusionKernel = [
  { dx: 1, dy: 0, w: 8 / 32 }, { dx: 2, dy: 0, w: 4 / 32 },
  { dx: -2, dy: 1, w: 2 / 32 }, { dx: -1, dy: 1, w: 4 / 32 }, { dx: 0, dy: 1, w: 8 / 32 }, { dx: 1, dy: 1, w: 4 / 32 }, { dx: 2, dy: 1, w: 2 / 32 },
]

const BAYER_2 = [[0, 2], [3, 1]]

const BAYER_4 = [
  [0,  8,  2, 10],
  [12, 4, 14,  6],
  [3, 11,  1,  9],
  [15, 7, 13,  5],
]

const BAYER_8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

function errorDiffusion(grey: Float32Array, w: number, h: number, kernel: DiffusionKernel): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const oldVal = grey[idx]!
      const newVal = quantize(oldVal)
      grey[idx] = newVal
      const err = oldVal - newVal
      for (const k of kernel) {
        const nx = x + k.dx, ny = y + k.dy
        if (nx >= 0 && nx < w && ny < h) grey[ny * w + nx]! += err * k.w
      }
    }
  }
}

function orderedDither(grey: Float32Array, w: number, h: number, matrix: number[][]): void {
  const n = matrix.length
  const maxVal = n * n
  const step = 255 / (LEVELS - 1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const threshold = (matrix[y % n]![x % n]! / maxVal - 0.5) * step
      grey[idx] = quantize(grey[idx]! + threshold)
    }
  }
}

function blueNoiseDither(grey: Float32Array, w: number, h: number): void {
  const step = 255 / (LEVELS - 1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      let hash = x * 374761393 + y * 668265263
      hash = (hash ^ (hash >> 13)) * 1274126177
      hash = hash ^ (hash >> 16)
      const noise = ((hash & 0xFFFF) / 0xFFFF - 0.5) * step
      grey[idx] = quantize(grey[idx]! + noise)
    }
  }
}

function halftoneDither(grey: Float32Array, w: number, h: number): void {
  const dotSize = 4, half = dotSize / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const cx = (x % dotSize) - half + 0.5
      const cy = (y % dotSize) - half + 0.5
      const dist = Math.sqrt(cx * cx + cy * cy) / (half * Math.SQRT2)
      grey[idx] = grey[idx]! > dist * 255 ? quantize(grey[idx]!) : 0
    }
  }
}

function thresholdDither(grey: Float32Array): void {
  for (let i = 0; i < grey.length; i++) grey[i] = quantize(grey[i]!)
}

function randomDither(grey: Float32Array): void {
  const step = 255 / (LEVELS - 1)
  for (let i = 0; i < grey.length; i++) {
    grey[i] = quantize(grey[i]! + (Math.random() - 0.5) * step)
  }
}

export function applyDitherToGrey(grey: Float32Array, w: number, h: number, mode: DitherMode): void {
  switch (mode) {
    case 'floyd-steinberg': return errorDiffusion(grey, w, h, KERNEL_FLOYD_STEINBERG)
    case 'atkinson':        return errorDiffusion(grey, w, h, KERNEL_ATKINSON)
    case 'jarvis':          return errorDiffusion(grey, w, h, KERNEL_JARVIS)
    case 'stucki':          return errorDiffusion(grey, w, h, KERNEL_STUCKI)
    case 'sierra':          return errorDiffusion(grey, w, h, KERNEL_SIERRA)
    case 'burkes':          return errorDiffusion(grey, w, h, KERNEL_BURKES)
    case 'bayer2':          return orderedDither(grey, w, h, BAYER_2)
    case 'bayer4':          return orderedDither(grey, w, h, BAYER_4)
    case 'bayer8':          return orderedDither(grey, w, h, BAYER_8)
    case 'blue-noise':      return blueNoiseDither(grey, w, h)
    case 'halftone':        return halftoneDither(grey, w, h)
    case 'threshold':       return thresholdDither(grey)
    case 'random':          return randomDither(grey)
  }
}
