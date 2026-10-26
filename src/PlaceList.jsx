import { useState } from 'react'
import { motion } from 'motion/react'
import { placeImage, walkMinutes, fmtDistance, pretty } from './api.js'

export default function PlaceList({ placeName, categories, cat, onCat, places, loading, hoveredId, onHover, onSelect, onSurprise }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      className={`panel list-panel${collapsed ? ' is-collapsed' : ''}`}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <button className="sheet-handle" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand list' : 'Collapse list'} />
      <header className="panel-head">
        <p className="eyebrow">You're in</p>
        <h1>{placeName || 'Locating…'}</h1>
        <p className="legend">
          <i style={{ '--c': '#38bdf8' }} />5 <i style={{ '--c': '#818cf8' }} />10 <i style={{ '--c': '#c084fc' }} />15 min walk
        </p>
      </header>

      <nav className="chips" aria-label="Categories">
        {categories.map(c => (
          <button
            key={c.id}
            className={`chip${c.id === cat.id ? ' is-active' : ''}`}
            style={{ '--c': c.color }}
            onClick={() => onCat(c)}
            aria-pressed={c.id === cat.id}
          >
            <span aria-hidden>{c.emoji}</span> {c.label}
          </button>
        ))}
      </nav>

      <div className="list-bar">
        <span>{loading ? 'Searching…' : `${places.length} ${cat.label.toLowerCase()} nearby`}</span>
        <button className="surprise" onClick={onSurprise} disabled={!places.length}>
          ✨ Surprise me
        </button>
      </div>

      <ul className="cards">
        {loading &&
          Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="card skeleton">
              <div className="thumb" />
              <div><b /><span /></div>
            </li>
          ))}
        {!loading && !places.length && <li className="empty">Nothing here — try another category.</li>}
        {!loading &&
          places.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.035 }}>
              <button
                className={`card${hoveredId === p.id ? ' is-hot' : ''}`}
                style={{ '--c': cat.color }}
                onClick={() => onSelect(p.id)}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
              >
                <img className="thumb" src={placeImage(p, 120, 120)} alt="" loading="lazy" />
                <div>
                  <strong>{p.name}</strong>
                  <span className="kind">{pretty(p.kind || cat.label)}</span>
                  <span className="walk">
                    🚶 {walkMinutes(p.meters)} min · {fmtDistance(p.meters)}
                  </span>
                </div>
              </button>
            </motion.li>
          ))}
      </ul>
    </motion.aside>
  )
}
