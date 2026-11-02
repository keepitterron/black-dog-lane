// Every hotspot gets invisible padding so it is at least 44 CSS px on a 360 px-wide phone
// (the scene is 800 units wide, so 44 px ≈ 98 units).
export const MIN_TAP_UNITS = Math.ceil((44 * 800) / 360)

export function padRect([x, y, w, h]: readonly [number, number, number, number]): [number, number, number, number] {
  const pw = Math.max(w, MIN_TAP_UNITS)
  const ph = Math.max(h, MIN_TAP_UNITS)
  return [x - (pw - w) / 2, y - (ph - h) / 2, pw, ph]
}
