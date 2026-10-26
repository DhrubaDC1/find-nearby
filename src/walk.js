// Game-mode movement along the walking route. Headings are compass degrees: 0 = north, 90 = east.
// Flat-earth approximation: fine over the few hundred meters of a walk.
const toRad = Math.PI / 180

const flatDistance = ([lng1, lat1], [lng2, lat2]) => Math.hypot((lng2 - lng1) * Math.cos(lat1 * toRad), lat2 - lat1) * 111320

// Heading that faces from `a` toward `b`.
export const bearingTo = ([lng1, lat1], [lng2, lat2]) =>
  Math.atan2((lng2 - lng1) * Math.cos(lat1 * toRad), lat2 - lat1) / toRad

// A route as something you can walk: total length, point at `s` meters, and which way it heads there.
export function track(line) {
  const cum = [0]
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + flatDistance(line[i - 1], line[i]))
  const length = cum.at(-1)

  const at = s => {
    s = Math.max(0, Math.min(length, s))
    let i = 1
    while (i < line.length - 1 && cum[i] < s) i++
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    const [a, b] = [line[i - 1], line[i]]
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }

  // Look `look` meters ahead so corners are rounded off; near the end, use the last stretch.
  const heading = (s, look) => {
    const from = Math.max(0, Math.min(s, length - look))
    return bearingTo(at(from), at(from + look))
  }

  return { length, at, heading }
}

// Signed shortest turn from heading `a` to `b`, in [-180, 180).
export const turn = (a, b) => ((((b - a) % 360) + 540) % 360) - 180
