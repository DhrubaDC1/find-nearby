import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import mapboxgl from 'mapbox-gl'
import { fmtDistance } from './api.js'
import { track, turn } from './walk.js'
import { avatarLayer, loadAvatar } from './avatar.js'

const WALK = 1.63 // m/s the walk clip covers at real size (printed by scripts/retarget.mjs)
const SIZE = 3 // × real size, so the character reads from the chase cam
const SPEED = WALK * SIZE // m/s (~4.9): the clip's natural cadence, so the legs keep a real walking rhythm
const SPRINT = 2 // Shift: × speed, and the same walk played that much faster
const CAM = { zoom: 21, pitch: 65 } // close behind, looking down the street; horizon sits just off the top edge
const AIM = 6 // meters ahead the character aims, so corners are rounded off
const STEER = 6 // how fast facing catches up with the route (1/s)
const LOOK_SPEED = 90 // degrees/s the camera orbits while A/D is held
const DRAG = { yaw: 0.3, pitch: 0.2 } // degrees per pixel dragged
const RECENTER_AFTER = 1500 // ms without look input before walking swings the camera back behind you
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v))
const KEYS = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1 }
const LOOK_KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }
const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight']
const MODEL = import.meta.env.BASE_URL + 'avatar.glb'
const CLIPS = [import.meta.env.BASE_URL + 'walk.json']

// App calls this when the page goes idle, so the character is ready before anyone hits play.
export const preload = () => loadAvatar(MODEL, CLIPS)

// Walk a character along the walking route to `place`, with W/S, arrows or an on-screen joystick.
export default function Game({ map, place, route, cat, onExit }) {
  const [left, setLeft] = useState(() => track(route.geometry.coordinates).length)
  const [time, setTime] = useState(null)
  const stick = useRef([0, 0])

  useEffect(() => {
    const pressed = new Set()
    const down = e => (KEYS[e.code] || LOOK_KEYS[e.code] || SPRINT_KEYS.includes(e.code)) && (e.preventDefault(), pressed.add(e.code))
    const up = e => pressed.delete(e.code)
    const blur = () => pressed.clear()
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', blur)

    // The character lives on the route: `s` is meters walked along it.
    const path = track(route.geometry.coordinates)
    let s = 0
    let pos = path.at(0)
    let dir = path.heading(0, AIM)
    const avatar = avatarLayer(MODEL, CLIPS)
    const place3d = () => {
      const merc = mapboxgl.MercatorCoordinate.fromLngLat(pos)
      avatar.setPose(merc, merc.meterInMercatorCoordinateUnits() * SIZE, dir)
    }
    place3d()
    map.addLayer(avatar.layer)
    // Third-person chase cam: low and behind, character in the lower third (top padding pushes the focus down).
    const chase = { top: innerHeight * 0.4, bottom: 0, left: 0, right: 0 }
    map.easeTo({ ...CAM, center: pos, bearing: dir, padding: chase, duration: 1500 })

    // Look around: the camera orbits the character by `look` degrees and tilts to `tilt`.
    // Map dragging is ours now (Mapbox's pan/rotate would pull the camera off the character); scroll/pinch zoom still work.
    let look = 0
    let tilt = CAM.pitch
    let lookedAt = 0
    let dirty = false
    let drag = null
    const canvas = map.getCanvas()
    const handlers = [map.keyboard, map.dragPan, map.dragRotate, map.touchPitch]
    handlers.forEach(h => h.disable())
    map.touchZoomRotate.disableRotation()
    canvas.style.touchAction = 'none'
    canvas.style.cursor = 'grab'
    const grab = e => {
      if (drag) return // second finger: leave it to pinch-zoom
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const pan = e => {
      if (e.pointerId !== drag?.id) return
      look += (e.clientX - drag.x) * DRAG.yaw
      tilt = clamp(tilt - (e.clientY - drag.y) * DRAG.pitch, 0, 85) // drag up to look up; 85 is Mapbox's max
      drag.x = e.clientX
      drag.y = e.clientY
      lookedAt = performance.now()
      dirty = true
    }
    const release = e => {
      if (e.pointerId !== drag?.id) return
      drag = null
      canvas.style.cursor = 'grab'
    }
    canvas.addEventListener('pointerdown', grab)
    canvas.addEventListener('pointermove', pan)
    canvas.addEventListener('pointerup', release)
    canvas.addEventListener('pointercancel', release)

    const t0 = performance.now()
    let last = t0
    let done = false
    let raf
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000) // clamp so a background tab doesn't teleport you
      last = now
      // Forward/back along the route; the route does the steering.
      let y = stick.current[1]
      let lookIn = 0
      for (const k of pressed) (y += KEYS[k] ?? 0), (lookIn += LOOK_KEYS[k] ?? 0)
      y = Math.abs(y) > 0.1 ? clamp(y) : 0
      if (lookIn) {
        look += clamp(lookIn) * LOOK_SPEED * dt
        lookedAt = now
        dirty = true
      } else if (y && !drag && now - lookedAt > RECENTER_AFTER && Math.abs(look) > 0.1) {
        look = turn(0, look) * (1 - Math.min(1, 3 * dt)) // GTA-style: walking swings the camera back behind you
        dirty = true
      }
      // Walk cadence follows speed so feet don't skate; S plays it in reverse.
      // Shift sprints forward: same clip, sped up with the movement so the feet stay planted.
      const pace = y * (y > 0 && SPRINT_KEYS.some(k => pressed.has(k)) ? SPRINT : 1)
      if (!done) y ? avatar.play(/walk/i, pace) : avatar.play(/breathing|idle/i)
      const steer = turn(dir, path.heading(s, AIM))
      if (!done && (y || Math.abs(steer) > 0.1)) {
        s = clamp(s + SPEED * pace * dt, 0, path.length)
        pos = path.at(s)
        dir += steer * Math.min(1, STEER * dt) // ease round corners instead of snapping
        place3d()
        dirty = true
        setLeft(path.length - s)
        if (s >= path.length) {
          done = true
          avatar.play(/happy/i)
          setTime((now - t0) / 1000)
        }
      }
      // Only touch the camera on change, so the intro easeTo and scroll-zoom aren't fought every frame.
      if (dirty) map.jumpTo({ center: pos, bearing: dir + look, pitch: tilt, padding: chase })
      dirty = false
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('keydown', down)
      removeEventListener('keyup', up)
      removeEventListener('blur', blur)
      map.removeLayer('avatar')
      canvas.removeEventListener('pointerdown', grab)
      canvas.removeEventListener('pointermove', pan)
      canvas.removeEventListener('pointerup', release)
      canvas.removeEventListener('pointercancel', release)
      canvas.style.touchAction = canvas.style.cursor = ''
      handlers.forEach(h => h.enable())
      map.touchZoomRotate.enableRotation()
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
        <span className="hint-keys">
          <kbd>W</kbd><kbd>S</kbd> walk · hold <kbd>Shift</kbd> to sprint · <kbd>A</kbd><kbd>D</kbd> or drag to look around · <kbd>Esc</kbd> to exit
        </span>
        <span className="hint-touch">Drag the map to look around</span>
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
