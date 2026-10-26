import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import MapView from './MapView.jsx'
import PlaceList from './PlaceList.jsx'
import PlaceDetail from './PlaceDetail.jsx'
import { TOKEN, reverseGeocode, forwardGeocode, categoryPlaces, walkRoute, walkRings, distance } from './api.js'
import { lightPreset } from './light.js'
import { readShare, shareSearch } from './share.js'

const CATEGORIES = [
  { id: 'tourist_attraction', label: 'Sights', emoji: '📸', color: '#f59e0b' },
  { id: 'restaurant', label: 'Food', emoji: '🍜', color: '#f43f5e' },
  { id: 'coffee', label: 'Coffee', emoji: '☕', color: '#d97706' },
  { id: 'museum', label: 'Museums', emoji: '🏛️', color: '#8b5cf6' },
  { id: 'park', label: 'Parks', emoji: '🌳', color: '#22c55e' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🍸', color: '#ec4899' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#06b6d4' },
  { id: 'lodging', label: 'Stays', emoji: '🛏️', color: '#3b82f6' },
  { id: 'saved', label: 'Saved', emoji: '❤️', color: '#ef4444' },
]
// three.js + the avatar only download when someone hits play.
const Game = lazy(() => import('./Game.jsx'))
const byId = id => CATEGORIES.find(c => c.id === id)
// Open on whatever fits the hour: coffee at dawn, bars at night.
const startCategory = { dawn: 'coffee', day: 'tourist_attraction', dusk: 'restaurant', night: 'nightlife' }
const shared = readShare(location.search)

function loadFavs() {
  try {
    const f = JSON.parse(localStorage.getItem('find-nearby:favs'))
    return Array.isArray(f) ? f : []
  } catch {
    return []
  }
}

export default function App() {
  const [preset, setPreset] = useState(lightPreset)
  const [loc, setLoc] = useState(shared.at)
  const [placeName, setPlaceName] = useState('')
  const [rings, setRings] = useState(null)
  const [cat, setCat] = useState(() => byId(shared.cat) ?? byId(startCategory[lightPreset()]))
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [favs, setFavs] = useState(loadFavs)
  const [map, setMap] = useState(null)
  const [playingId, setPlayingId] = useState(null)
  const pending = useRef(shared.place)

  // Saved places come from storage, so distances are measured from wherever you are now.
  const shown = useMemo(
    () => (cat.id === 'saved' && loc ? favs.map(p => ({ ...p, meters: distance(loc, p.coords) })).sort((a, b) => a.meters - b.meters) : places),
    [cat, favs, loc, places]
  )
  const selected = shown.find(p => p.id === selectedId) ?? null
  const playing = !!map && !!selected && playingId === selected.id

  useEffect(() => {
    document.documentElement.dataset.light = preset
    const t = setInterval(() => setPreset(lightPreset()), 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [preset])

  // Picking another place (e.g. tapping a pin mid-game) ends the game.
  useEffect(() => setPlayingId(null), [selectedId])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 4500)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && (playing ? setPlayingId(null) : setSelectedId(null))
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [playing])

  useEffect(() => {
    if (!loc) return
    reverseGeocode(loc).then(setPlaceName, () => setPlaceName('Somewhere new'))
    walkRings(loc).then(setRings, () => {})
  }, [loc])

  useEffect(() => {
    if (!loc) return
    let stale = false
    setSelectedId(null)
    if (cat.id === 'saved') return setLoading(false)
    setLoading(true)
    // ponytail: a shared place is found by re-running the same search at the same spot; store the place in the URL if results drift.
    categoryPlaces(cat.id, loc)
      .then(p => {
        if (stale) return
        setPlaces(p)
        setSelectedId(pending.current)
        pending.current = null
      })
      .catch(e => !stale && (setPlaces([]), setError(e.message)))
      .finally(() => !stale && setLoading(false))
    return () => { stale = true }
  }, [loc, cat])

  useEffect(() => {
    setRoute(null)
    if (!selected) return
    let stale = false
    walkRoute(loc, selected.coords).then(r => !stale && setRoute(r), () => {})
    return () => { stale = true }
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the URL pointing at the current view so it can be shared as-is.
  useEffect(() => {
    if (loc) history.replaceState(null, '', shareSearch(loc, selected?.catId ?? cat.id, selected?.id))
  }, [loc, cat, selected])

  useEffect(() => {
    try {
      localStorage.setItem('find-nearby:favs', JSON.stringify(favs))
    } catch {}
  }, [favs])

  const toggleFav = p =>
    setFavs(f => (f.some(x => x.id === p.id) ? f.filter(x => x.id !== p.id) : [...f, { ...p, catId: cat.id }]))

  const surprise = () => {
    const pool = shown.filter(p => p.id !== selectedId)
    if (pool.length) setSelectedId(pool[Math.floor(Math.random() * pool.length)].id)
  }

  if (!TOKEN) {
    return (
      <div className="intro">
        <div className="panel intro-card">
          <h1>Missing Mapbox token</h1>
          <p>Copy <code>.env.example</code> to <code>.env</code>, set <code>VITE_MAPBOX_TOKEN</code>, restart <code>npm run dev</code>.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <MapView
        center={loc}
        preset={preset}
        rings={rings}
        places={shown}
        cat={cat}
        selected={selected}
        hoveredId={hoveredId}
        route={route}
        onSelect={setSelectedId}
        onHover={setHoveredId}
        onMap={setMap}
      />

      <AnimatePresence>
        {!loc && <Intro key="intro" onLocate={setLoc} onError={setError} />}
      </AnimatePresence>

      {loc && !playing && (
        <PlaceList
          placeName={placeName}
          categories={CATEGORIES}
          cat={cat}
          onCat={setCat}
          places={shown}
          loading={loading}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          onSelect={setSelectedId}
          onSurprise={surprise}
        />
      )}

      <AnimatePresence>
        {selected && !playing && (
          <PlaceDetail
            key={selected.id}
            place={selected}
            route={route}
            cat={cat}
            saved={favs.some(f => f.id === selected.id)}
            onToggleSave={() => toggleFav(selected)}
            onPlay={() => setPlayingId(selected.id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      <Suspense>
        {playing && route && <Game key={selected.id} map={map} place={selected} route={route} cat={cat} onExit={() => setPlayingId(null)} />}
      </Suspense>

      <AnimatePresence>
        {error && (
          <motion.div className="toast" role="alert" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Intro({ onLocate, onError }) {
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const [q, setQ] = useState('')

  const locate = () => {
    if (!navigator.geolocation) return setDenied(true)
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      pos => onLocate([pos.coords.longitude, pos.coords.latitude]),
      () => (setBusy(false), setDenied(true)),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const search = async e => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      const c = await forwardGeocode(q.trim())
      c ? onLocate(c) : onError(`Couldn't find “${q}”.`)
    } catch (err) {
      onError(err.message)
    }
    setBusy(false)
  }

  return (
    <motion.div className="intro" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.5 }}>
      <motion.div className="panel intro-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
        <p className="eyebrow">Just landed?</p>
        <h1>Find what's around you.</h1>
        <p className="lede">Sights, food, coffee and late-night spots — all within a short walk.</p>
        <button className="btn primary big" onClick={locate} disabled={busy}>
          {busy ? 'Locating…' : '📍 Use my location'}
        </button>
        {denied && <p className="hint">Location unavailable — type where you are instead.</p>}
        <form className="search" onSubmit={search}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Or enter a city, street or hotel" aria-label="Your location" />
          <button className="btn" disabled={busy}>Go</button>
        </form>
      </motion.div>
    </motion.div>
  )
}
