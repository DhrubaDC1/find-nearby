import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readShare, shareSearch } from './share.js'

test('share link round-trips', () => {
  const s = shareSearch([2.3376, 48.8606], 'coffee', 'dXJu:abc')
  assert.deepEqual(readShare(s), { at: [2.3376, 48.8606], cat: 'coffee', place: 'dXJu:abc' })
  assert.equal(readShare(shareSearch([1, 2], 'park')).place, null)
})

test('bad coordinates are ignored', () => {
  for (const at of ['', '1', '1,2,3', 'x,2', '200,10', '10,-91']) assert.equal(readShare(`?at=${at}`).at, null)
  assert.equal(readShare('').at, null)
})
