// Map light preset from the viewer's local clock (they're physically at the place).
// ponytail: fixed hour buckets, swap for suncalc sunrise/sunset if high latitudes matter.
export function lightPreset(date = new Date()) {
  const h = date.getHours()
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 18) return 'day'
  if (h >= 18 && h < 21) return 'dusk'
  return 'night'
}
