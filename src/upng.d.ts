declare module 'upng-js' {
  const UPNG: {
    encode(imgs: ArrayBuffer[], w: number, h: number, cnum: number): ArrayBuffer
    decode(buf: ArrayBuffer): { width: number; height: number; depth: number; ctype: number; frames: ArrayBuffer[] }
  }
  export default UPNG
}
