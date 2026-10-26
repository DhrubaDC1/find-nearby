import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPreset } from './light.js'

const at = (h, m = 0) => new Date(2026, 0, 1, h, m)

test('light preset boundaries', () => {
  assert.equal(lightPreset(at(4, 59)), 'night')
  assert.equal(lightPreset(at(5)), 'dawn')
  assert.equal(lightPreset(at(8)), 'day')
  assert.equal(lightPreset(at(17, 59)), 'day')
  assert.equal(lightPreset(at(18)), 'dusk')
  assert.equal(lightPreset(at(21)), 'night')
  assert.equal(lightPreset(at(0)), 'night')
})
