export const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const BASE = 'https://api.mapbox.com'

async function get(path, params = {}) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries({ ...params, access_token: TOKEN })) url.searchParams.set(k, v)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Mapbox request failed (${res.status})`)
  return res.json()
}

export async function reverseGeocode([lng, lat]) {
  const data = await get('/search/geocode/v6/reverse', {
    longitude: lng,
    latitude: lat,
    types: 'neighborhood,locality,place',
  })
  const p = data.features[0]?.properties
  if (!p) return 'Somewhere new'
  const city = p.context?.place?.name
  return city && city !== p.name ? `${p.name}, ${city}` : p.name
}

export async function forwardGeocode(q) {
  const data = await get('/search/geocode/v6/forward', { q, limit: 1 })
  return data.features[0]?.geometry.coordinates ?? null
}

export async function categoryPlaces(category, origin) {
  const data = await get(`/search/searchbox/v1/category/${category}`, {
    proximity: origin.join(','),
    limit: 25,
    language: 'en',
  })
  return data.features
    .map(f => ({
      id: f.properties.mapbox_id,
      name: f.properties.name,
      address: f.properties.full_address || f.properties.address || '',
      kind: f.properties.poi_category?.[0] ?? '',
      coords: f.geometry.coordinates,
      meta: f.properties.metadata ?? {},
      meters: distance(origin, f.geometry.coordinates),
    }))
    .sort((a, b) => a.meters - b.meters)
}

export async function walkRoute(from, to) {
  const data = await get(`/directions/v5/mapbox/walking/${from.join(',')};${to.join(',')}`, {
    geometries: 'geojson',
    overview: 'full',
  })
  return data.routes[0] ?? null
}

export function walkRings([lng, lat]) {
  return get(`/isochrone/v1/mapbox/walking/${lng},${lat}`, {
    contours_minutes: '5,10,15',
    polygons: true,
  })
}

export function staticImage([lng, lat], w, h, zoom = 17) {
  return `${BASE}/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},${zoom},0,50/${w}x${h}@2x?access_token=${TOKEN}`
}

// Photo URL when Mapbox has one for this POI, else satellite snapshot.
export function placeImage(place, w, h) {
  const m = place.meta
  return m.primary_photo || m.photos?.[0]?.url || staticImage(place.coords, w, h)
}

// Haversine, meters.
export function distance([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(a))
}

export const walkMinutes = meters => Math.max(1, Math.round(meters / 80))
export const fmtDistance = m => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)
export const pretty = s => s.replace(/_/g, ' ')

// open_hours day: 0 = Sunday (matches Date.getDay; checked against real closed-Monday museums).
export function todayHours(openHours, now = new Date()) {
  const periods = openHours?.periods?.filter(p => p.open?.day === now.getDay())
  if (!periods?.length) return null
  const t = s => `${s.slice(0, 2)}:${s.slice(2)}`
  return periods.map(p => (p.close ? `${t(p.open.time)}–${t(p.close.time)}` : 'Open 24h')).join(', ')
}
