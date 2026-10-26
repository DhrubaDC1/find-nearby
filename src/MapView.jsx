import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { TOKEN } from './api.js'

mapboxgl.accessToken = TOKEN
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const empty = { type: 'FeatureCollection', features: [] }

// Keep the camera's focus clear of the side panel (desktop) or bottom sheet (phone).
function padding() {
  return innerWidth < 720
    ? { top: 60, bottom: innerHeight * 0.5, left: 30, right: 30 }
    : { top: 80, bottom: 80, left: 440, right: 80 }
}

export default function MapView({ center, preset, rings, places, cat, selected, hoveredId, route, onSelect, onHover }) {
  const el = useRef(null)
  const map = useRef(null)
  const pins = useRef(new Map())
  const spinning = useRef(!reduceMotion)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const m = new mapboxgl.Map({
      container: el.current,
      style: 'mapbox://styles/mapbox/standard',
      config: { basemap: { lightPreset: preset, showPointOfInterestLabels: false } },
      projection: 'globe',
      center: [20, 25],
      zoom: 1.6,
    })
    map.current = m

    // Slow globe spin until we know where the user is.
    const spin = () => {
      if (!spinning.current) return
      const c = m.getCenter()
      c.lng -= 8
      m.easeTo({ center: c, duration: 1000, easing: n => n })
    }
    m.on('moveend', spin)

    m.on('load', () => {
      m.addSource('rings', { type: 'geojson', data: empty })
      m.addLayer({
        id: 'rings-fill',
        type: 'fill',
        source: 'rings',
        slot: 'middle',
        paint: {
          'fill-color': ['match', ['get', 'contour'], 5, '#38bdf8', 10, '#818cf8', '#c084fc'],
          'fill-opacity': 0.1,
          'fill-emissive-strength': 1,
        },
      })
      m.addLayer({
        id: 'rings-line',
        type: 'line',
        source: 'rings',
        slot: 'middle',
        paint: {
          'line-color': ['match', ['get', 'contour'], 5, '#38bdf8', 10, '#818cf8', '#c084fc'],
          'line-width': 1.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
          'line-emissive-strength': 1,
        },
      })
      m.addSource('route', { type: 'geojson', data: empty, lineMetrics: true })
      m.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        slot: 'top',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 6,
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#38bdf8', 1, '#f472b6'],
          'line-emissive-strength': 1,
        },
      })
      setReady(true)
      spin()
    })
    return () => m.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ready) map.current.setConfigProperty('basemap', 'lightPreset', preset)
  }, [ready, preset])

  // Fly from the globe to the user, then a slow cinematic orbit.
  useEffect(() => {
    if (!ready || !center) return
    const m = map.current
    spinning.current = false
    const dot = document.createElement('div')
    dot.className = 'user-dot'
    const marker = new mapboxgl.Marker({ element: dot }).setLngLat(center).addTo(m)
    m.flyTo({ center, zoom: 15.2, pitch: 60, bearing: -20, padding: padding(), duration: reduceMotion ? 0 : 6000, essential: true })
    if (!reduceMotion) m.once('moveend', () => m.easeTo({ bearing: 30, duration: 24000, easing: n => n }))
    return () => marker.remove()
  }, [ready, center])

  useEffect(() => {
    if (ready) map.current.getSource('rings').setData(rings ?? empty)
  }, [ready, rings])

  // Place pins: rebuilt when the result set changes.
  useEffect(() => {
    if (!ready) return
    const m = map.current
    const made = places.map((p, i) => {
      const btn = document.createElement('button')
      btn.className = 'pin'
      btn.style.setProperty('--c', cat.color)
      btn.style.setProperty('--i', i)
      btn.textContent = cat.emoji
      btn.setAttribute('aria-label', p.name)
      btn.onclick = e => (e.stopPropagation(), onSelect(p.id))
      btn.onmouseenter = () => onHover(p.id)
      btn.onmouseleave = () => onHover(null)
      pins.current.set(p.id, btn)
      return new mapboxgl.Marker({ element: btn }).setLngLat(p.coords).addTo(m)
    })
    if (places.length && center) {
      const b = new mapboxgl.LngLatBounds(center, center)
      places.forEach(p => b.extend(p.coords))
      m.fitBounds(b, { padding: padding(), maxZoom: 16, pitch: 50, duration: reduceMotion ? 0 : 1800 })
    }
    return () => {
      made.forEach(mk => mk.remove())
      pins.current.clear()
    }
  }, [ready, places]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    pins.current.forEach((btn, id) => {
      btn.classList.toggle('is-hot', id === hoveredId)
      btn.classList.toggle('is-selected', id === selected?.id)
    })
  }, [hoveredId, selected, places])

  // Selected place: draw walking route and frame it.
  useEffect(() => {
    if (!ready) return
    const m = map.current
    m.getSource('route').setData(route ? { type: 'Feature', geometry: route.geometry } : empty)
    const opts = { padding: padding(), duration: reduceMotion ? 0 : 1600 }
    if (route) {
      const b = new mapboxgl.LngLatBounds()
      route.geometry.coordinates.forEach(c => b.extend(c))
      m.fitBounds(b, { ...opts, maxZoom: 17.5, pitch: 55 })
    } else if (selected) {
      m.flyTo({ ...opts, center: selected.coords, zoom: 17, pitch: 60 })
    }
  }, [ready, selected, route])

  return <div ref={el} className="map" />
}
