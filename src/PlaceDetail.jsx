import { useState } from 'react'
import { motion } from 'motion/react'
import { placeImage, walkMinutes, fmtDistance, pretty, todayHours } from './api.js'

export default function PlaceDetail({ place, route, cat, saved, onToggleSave, onPlay, onClose }) {
  const [copied, setCopied] = useState(false)
  const [lng, lat] = place.coords
  const meters = route?.distance ?? place.meters
  const mins = route ? Math.max(1, Math.round(route.duration / 60)) : walkMinutes(place.meters)
  const { phone, website, rating, review_count } = place.meta
  const hours = todayHours(place.meta.open_hours)

  // App keeps location.href in sync with the open place.
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title: place.name, url: location.href })
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
    } catch {} // share sheet dismissed or clipboard blocked
  }

  return (
    <motion.aside
      className="panel detail-panel"
      style={{ '--c': cat.color }}
      initial={{ opacity: 0, x: -40, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      aria-label={place.name}
    >
      <div className="hero">
        <img src={placeImage(place, 640, 380)} alt="" />
        <button className="close fav" onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save place'}>
          {saved ? '♥' : '♡'}
        </button>
        <button className="close" onClick={onClose} aria-label="Close details (Esc)">✕</button>
        <div className="hero-text">
          <span className="badge">{cat.emoji} {pretty(place.kind || cat.label)}</span>
          <h2>{place.name}</h2>
        </div>
      </div>

      <div className="stats">
        <div><b>{mins}</b><span>min walk</span></div>
        <div><b>{fmtDistance(meters)}</b><span>{route ? 'by foot' : 'away'}</span></div>
        {rating != null && <div><b>★ {Number(rating).toFixed(1)}</b><span>{review_count ? `${review_count} reviews` : 'rating'}</span></div>}
      </div>

      <dl className="facts">
        {place.address && (<><dt>Address</dt><dd>{place.address}</dd></>)}
        {hours && (<><dt>Today</dt><dd>{hours}</dd></>)}
        {phone && (<><dt>Phone</dt><dd><a href={`tel:${phone}`}>{phone}</a></dd></>)}
        {website && (<><dt>Website</dt><dd><a href={website} target="_blank" rel="noreferrer">{website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></dd></>)}
      </dl>

      <div className="actions">
        {/* The game walks the route, so it waits for one. */}
        <button className="btn primary big" onClick={onPlay} disabled={!route}>
          {route ? '🎮 Walk there yourself' : 'Finding a route…'}
        </button>
      </div>
      <div className="actions">
        <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`} target="_blank" rel="noreferrer">
          Walk there
        </a>
        <a className="btn" href={`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`} target="_blank" rel="noreferrer">
          Apple Maps
        </a>
        <button className="btn" onClick={share}>
          {copied ? 'Copied ✓' : 'Share'}
        </button>
      </div>
    </motion.aside>
  )
}
