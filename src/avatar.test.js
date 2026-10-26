import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Vector3 } from 'three'
import { loadClip, modelMatrix } from './avatar.js'

// Where the model's forward (+z) and up (+y) end up in mercator (x east, y south, z up).
const dir = (heading, v) => {
  const m = modelMatrix({ x: 0, y: 0, z: 0 }, 1, heading)
  return new Vector3(...v).applyMatrix4(m).toArray().map(n => Math.round(n * 1e6) / 1e6 + 0)
}

test('model stands up and faces its heading', () => {
  assert.deepEqual(dir(0, [0, 1, 0]), [0, 0, 1]) // up is up
  assert.deepEqual(dir(0, [0, 0, 1]), [0, -1, 0]) // north
  assert.deepEqual(dir(90, [0, 0, 1]), [1, 0, 0]) // east
  assert.deepEqual(dir(180, [0, 0, 1]), [0, 1, 0]) // south
})

test('shipped walk clip loads and drives the avatar skeleton', async () => {
  const json = readFileSync(new URL('../public/walk.json', import.meta.url), 'utf8')
  const clip = await loadClip('data:application/json,' + encodeURIComponent(json))
  assert.equal(clip.name, 'Walk')
  assert.ok(clip.tracks.some(t => t.name === 'LeftUpLeg.quaternion'))
})
