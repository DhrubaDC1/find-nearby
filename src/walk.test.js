import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bearingTo, track, turn } from './walk.js'

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

test('bearingTo faces the target', () => {
  near(bearingTo([0, 0], [0, 1]), 0)
  near(bearingTo([0, 0], [1, 0]), 90)
  near(bearingTo([0, 0], [-1, 0]), -90)
  near(bearingTo([0, 60], [0.001, 60]), 90)
})

test('track walks an L-shaped route', () => {
  const deg = 100 / 111320 // 100 m in degrees at the equator
  const t = track([[0, 0], [0, deg], [deg, deg]]) // 100 m north, then 100 m east
  near(t.length, 200, 1e-6)
  assert.deepEqual(t.at(0), [0, 0])
  near(t.at(50)[1], deg / 2)
  near(t.at(150)[0], deg / 2)
  assert.deepEqual(t.at(-5), [0, 0]) // clamped to the ends
  assert.deepEqual(t.at(999), [deg, deg])
  near(t.heading(10, 5), 0) // first leg: north
  near(t.heading(120, 5), 90) // second leg: east
  near(t.heading(200, 5), 90) // at the very end: still the last leg, not a degenerate 0
  near(t.heading(98, 5), bearingTo(t.at(98), t.at(103))) // cutting the corner
})

test('turn picks the short way round', () => {
  near(turn(10, 30), 20)
  near(turn(350, 10), 20)
  near(turn(10, 350), -20)
  near(Math.abs(turn(0, 180)), 180) // half-turn: either way
})
