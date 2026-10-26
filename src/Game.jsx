import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import mapboxgl from 'mapbox-gl'
import { fmtDistance } from './api.js'
import { track, turn } from './walk.js'
import { avatarLayer } from './avatar.js'

const SPEED = 10 // m/s: brisk game pace (~2.3× the walk clip's natural cadence at SIZE)
const WALK = 1.45 // m/s the walk clip covers at real size (printed by scripts/retarget.mjs)
const SIZE = 3 // × real size, so the character reads from the chase cam
const CAM = { zoom: 21, pitch: 65 } // close behind, looking down the street; horizon sits just off the top edge
const LOOK = 6 // meters ahead the character aims, so corners are rounded off
const STEER = 6 // how fast facing catches up with the route (1/s)
const clamp = v => Math.max(-1, Math.min(1, v))
const KEYS = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1 }

// Walk a character along the walking route to `place`, with W/S, arrows or an on-screen joystick.
export default function Game({ map, place, route, cat, onExit }) {
  const [left, setLeft] = useState(() => track(route.geometry.coordinates).length)
  const [time, setTime] = useState(null)
  const stick = useRef([0, 0])

  useEffect(() => {
    const pressed = new Set()
    const down = e => KEYS[e.code] && (e.preventDefault(), pressed.add(e.code))
    const up = e => pressed.delete(e.code)
    const blur = () => pressed.clear()
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', blur)

    // The character lives on the route: `s` is meters walked along it.
    const path = track(route.geometry.coordinates)
    let s = 0
    let pos = path.at(0)
    let dir = path.heading(0, LOOK)
    const avatar = avatarLayer(import.meta.env.BASE_URL + 'avatar.glb', [import.meta.env.BASE_URL + 'walk.json'])
    const place3d = () => {
      const merc = mapboxgl.MercatorCoordinate.fromLngLat(pos)
      avatar.setPose(merc, merc.meterInMercatorCoordinateUnits() * SIZE, dir)
    }
    place3d()
    map.addLayer(avatar.layer)
    map.keyboard.disable() // its arrow-key panning would fight ours
    // Third-person chase cam: low and behind, character in the lower third (top padding pushes the focus down).
    const chase = { top: innerHeight * 0.4, bottom: 0, left: 0, right: 0 }
    map.easeTo({ ...CAM, center: pos, bearing: dir, padding: chase, duration: 1500 })

    const t0 = performance.now()
    let last = t0
    let done = false
    let raf
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000) // clamp so a background tab doesn't teleport you
      last = now
      // Forward/back along the route; the route does the steering.
      let y = stick.current[1]
      for (const k of pressed) y += KEYS[k]
      y = Math.abs(y) > 0.1 ? clamp(y) : 0
      // Walk cadence follows speed so feet don't skate; S plays it in reverse.
      if (!done) y ? avatar.play(/walk/i, (SPEED * y) / (WALK * SIZE)) : avatar.play(/breathing|idle/i)
      const steer = turn(dir, path.heading(s, LOOK))
      if (!done && (y || Math.abs(steer) > 0.1)) {
        s = Math.max(0, Math.min(path.length, s + SPEED * y * dt))
        pos = path.at(s)
        dir += steer * Math.min(1, STEER * dt) // ease round corners instead of snapping
        place3d()
        map.jumpTo({ center: pos, bearing: dir, padding: chase })
        setLeft(path.length - s)
        if (s >= path.length) {
          done = true
          avatar.play(/happy/i)
          setTime((now - t0) / 1000)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('keydown', down)
      removeEventListener('keyup', up)
      removeEventListener('blur', blur)
      map.removeLayer('avatar')
      map.keyboard.enable()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <motion.div
        className="panel hud"
        style={{ '--c': cat.color }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
      >
        {time == null ? (
          <span>
            {cat.emoji} <b>{place.name}</b> · {fmtDistance(left)} to go
          </span>
        ) : (
          <b>🎉 You made it in {Math.round(time)}s!</b>
        )}
        <button className="btn" onClick={onExit}>
          {time == null ? 'Exit' : 'Done'}
        </button>
      </motion.div>
      <p className="game-hint">
<kbd>W</kbd><kbd>S</kbd> or <kbd>↑</kbd><kbd>↓</kbd> to walk the route · <kbd>Esc</kbd> to exit
      </p>
      <Joystick stick={stick} />
    </>
  )
}

function Joystick({ stick }) {
  const knob = useRef(null)

  const drag = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const R = r.width / 2
    let x = (e.clientX - r.left - R) / R
    let y = (r.top + R - e.clientY) / R
    const m = Math.hypot(x, y)
    if (m > 1) (x /= m), (y /= m)
    stick.current = [x, y]
    knob.current.style.translate = `${x * 34}px ${-y * 34}px`
  }
  const stop = () => {
    stick.current = [0, 0]
    knob.current.style.translate = ''
  }

  return (
    <div
      className="panel joystick"
      aria-hidden
      onPointerDown={e => (e.currentTarget.setPointerCapture(e.pointerId), drag(e))}
      onPointerMove={e => e.currentTarget.hasPointerCapture(e.pointerId) && drag(e)}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <div ref={knob} />
    </div>
  )
}
