// Shareable view: ?at=lng,lat&cat=id&place=mapbox_id
export function readShare(search) {
  const q = new URLSearchParams(search)
  const at = q.get('at')?.split(',').map(Number)
  const ok = at?.length === 2 && at.every(Number.isFinite) && Math.abs(at[0]) <= 180 && Math.abs(at[1]) <= 90
  return { at: ok ? at : null, cat: q.get('cat'), place: q.get('place') }
}

export function shareSearch([lng, lat], catId, placeId) {
  const s = `?at=${lng.toFixed(5)},${lat.toFixed(5)}&cat=${encodeURIComponent(catId)}`
  return placeId ? `${s}&place=${encodeURIComponent(placeId)}` : s
}
