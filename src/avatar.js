import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

// Mapbox's own `model` layer can't play skinned animations, so the character is drawn with three.js in a custom layer.

// glTF frame (y up, +z forward) → Mapbox mercator frame (x east, y south, z up), facing compass `heading`.
export function modelMatrix({ x, y, z }, scale, heading) {
  return new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI - (heading * Math.PI) / 180))
}

// Parse once (preloaded at startup, reused by every game). Extra clips are AnimationClip JSON (see scripts/retarget.mjs).
let loading
// parse() does `new this(...)`, so it must be called on AnimationClip, not passed bare to .then().
export const loadClip = url => fetch(url).then(r => r.json()).then(j => THREE.AnimationClip.parse(j))
// A missing clip only costs that animation, never the character.
const optional = p => p.catch(e => (console.warn('avatar clip failed', e), null))
// avatar.glb is meshopt-compressed (see README), so the loader needs the decoder.
// A failed load isn't cached, so a background preload that hits a network blip gets retried when you press play.
export const loadAvatar = (url, extra) =>
  (loading ??= Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url),
    ...extra.map(u => optional(loadClip(u))),
  ]).catch(e => {
    loading = null
    throw e
  }))

export function avatarLayer(url, extraClips = []) {
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(1, 3, 2)
  scene.add(sun)

  let map, renderer, mixer, current
  let clips = []
  let want = /idle/i
  let pose = new THREE.Matrix4()
  let last = performance.now()

  // Cross-fade to the first clip whose name matches; no match keeps the current one.
  // timeScale lets the walk keep pace with movement (negative plays it backwards).
  const play = (re, timeScale = 1) => {
    want = re
    const clip = clips.find(c => re.test(c.name))
    if (!clip) return
    const next = mixer.clipAction(clip)
    if (next !== current) {
      next.reset().fadeIn(0.25).play()
      current?.fadeOut(0.25)
      current = next
    }
    current.timeScale = timeScale
  }

  loadAvatar(url, extraClips).then(([gltf, ...extra]) => {
    scene.add(gltf.scene)
    mixer = new THREE.AnimationMixer(gltf.scene)
    clips = [...gltf.animations, ...extra.filter(Boolean)]
    play(want)
  })

  return {
    play,
    setPose: (merc, scale, heading) => (pose = modelMatrix(merc, scale, heading)),
    layer: {
      id: 'avatar',
      type: 'custom',
      renderingMode: '3d',
      onAdd(m, gl) {
        map = m
        renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true })
        renderer.autoClear = false
      },
      render(gl, matrix) {
        const now = performance.now()
        mixer?.update((now - last) / 1000)
        last = now
        camera.projectionMatrix.fromArray(matrix).multiply(pose)
        renderer.resetState()
        renderer.render(scene, camera)
        map.triggerRepaint() // keep the animation ticking
      },
    },
  }
}
