// Retarget a clip from a Mixamo rig (Xbot.glb) onto avatar.glb's skeleton, in world space so differing bone axes don't matter.
// Made public/walk.json from three.js's Mixamo-rigged Xbot (https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/Xbot.glb):
//   node scripts/retarget.mjs Xbot.glb public/avatar.glb walk Walk public/walk.json
import fs from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const [srcPath, dstPath, clipName, outName, outPath] = process.argv.slice(2)

const b = fs.readFileSync(srcPath)
const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
const src = gltf.scene
const clip = gltf.animations.find(c => c.name === clipName)

// Target skeleton straight from the glTF JSON: no need to decode its meshes/textures.
const db = fs.readFileSync(dstPath)
const j = JSON.parse(db.subarray(20, 20 + db.readUInt32LE(12)))
const objs = j.nodes.map(n => {
  const o = new THREE.Object3D()
  o.name = THREE.PropertyBinding.sanitizeNodeName(n.name ?? '')
  if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale)
  if (n.translation) o.position.fromArray(n.translation)
  if (n.rotation) o.quaternion.fromArray(n.rotation)
  if (n.scale) o.scale.fromArray(n.scale)
  return o
})
j.nodes.forEach((n, i) => n.children?.forEach(c => objs[i].add(objs[c])))
const dst = new THREE.Group()
j.scenes[j.scene ?? 0].nodes.forEach(i => dst.add(objs[i]))
const joints = j.skins[0].joints.map(i => objs[i])

const wq = o => o.getWorldQuaternion(new THREE.Quaternion())
const wp = o => o.getWorldPosition(new THREE.Vector3())
const srcOf = new Map(joints.map(t => [t, src.getObjectByName('mixamorig' + t.name)]).filter(([, s]) => s))
console.log('mapped', srcOf.size, '/', joints.length, 'unmapped:', joints.filter(t => !srcOf.has(t)).map(t => t.name).join(' '))

const restQ = new Map([...joints, ...srcOf.values()].map(o => [o, wq(o)]))
const dHips = joints.find(t => t.name === 'Hips')
const sHips = srcOf.get(dHips)
const sHipsRest = wp(sHips)
const dHipsRest = wp(dHips)
const ratio = dHipsRest.y / sHipsRest.y
console.log('hip heights', sHipsRest.y.toFixed(3), dHipsRest.y.toFixed(3), 'ratio', ratio.toFixed(3))

const mixer = new THREE.AnimationMixer(src)
mixer.clipAction(clip).play()
const fps = 30
const frames = Math.round(clip.duration * fps)
const times = []
const quats = new Map(joints.map(t => [t, []]))
const hipsPos = []
let footMin = Infinity, footMax = -Infinity
const sFoot = src.getObjectByName('mixamorigLeftFoot')

for (let f = 0; f <= frames; f++) {
  const t = (f / frames) * clip.duration
  mixer.setTime(f === frames ? 0 : t) // last key = first: seamless loop
  times.push(t)
  src.updateMatrixWorld(true)
  const z = wp(sFoot).z - wp(sHips).z
  footMin = Math.min(footMin, z)
  footMax = Math.max(footMax, z)

  dst.traverse(o => {
    const s = srcOf.get(o)
    if (!s) return
    // Same world-space rotation away from the shared T-pose, re-expressed in the target bone's parent.
    const want = wq(s).multiply(restQ.get(s).clone().invert()).multiply(restQ.get(o))
    o.quaternion.copy(wq(o.parent).invert().multiply(want))
    o.updateMatrixWorld(true)
  })
  // Hips: keep the bob and sway, drop forward travel (the game moves the character itself).
  const d = wp(sHips).sub(sHipsRest).multiplyScalar(ratio)
  d.z = 0
  const p = dHips.parent.worldToLocal(dHipsRest.clone().add(d))
  hipsPos.push(...p.toArray())

  for (const [o, arr] of quats) {
    const q = o.quaternion.toArray()
    const prev = arr.slice(-4)
    if (prev.length && prev[0] * q[0] + prev[1] * q[1] + prev[2] * q[2] + prev[3] * q[3] < 0) q.forEach((v, i) => (q[i] = -v))
    arr.push(...q)
  }
}

const r = v => Math.round(v * 1e5) / 1e5
const tracks = [
  ...[...quats].map(([o, v]) => new THREE.QuaternionKeyframeTrack(`${o.name}.quaternion`, times, v.map(r))),
  new THREE.VectorKeyframeTrack('Hips.position', times, hipsPos.map(r)),
]
const out = new THREE.AnimationClip(outName, clip.duration, tracks)
fs.writeFileSync(outPath, JSON.stringify(THREE.AnimationClip.toJSON(out)))
// One gait cycle = two steps of roughly the foot's fore-aft sweep.
const speed = (2 * (footMax - footMin) * ratio) / clip.duration
console.log('duration', clip.duration.toFixed(3), 'natural speed ≈', speed.toFixed(2), 'm/s at real size')
console.log('wrote', outPath, fs.statSync(outPath).size, 'bytes')
