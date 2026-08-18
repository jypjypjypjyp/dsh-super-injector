import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { resolveRouterCore, sha256 } from './router-observer.ts'

test('sha256 returns hex digest', () => {
  const h = sha256('abc')
  assert.match(h, /^[0-9a-f]{64}$/)
  assert.equal(h, createHash('sha256').update('abc').digest('hex'))
})

test('resolveRouterCore returns mirror with pinned digest when no DSH_HOME', async () => {
  const prevDSHHome = process.env.DSH_HOME
  process.env.DSH_HOME = tmpdir() + '/router-observer-test-' + Date.now()
  try {
    const { core, source } = await resolveRouterCore()
    assert.ok(core.classifyTask)
    assert.equal(typeof core.classifyTask('写一个爬虫'), 'number') // react → 1
    assert.equal(source.kind, 'mirror')
    assert.match(source.hash, /^[0-9a-f]{64}$/)
    assert.equal(source.match, true) // mirror self-consistent
  } finally {
    if (prevDSHHome === undefined) {
      delete process.env.DSH_HOME
    } else {
      process.env.DSH_HOME = prevDSHHome
    }
  }
})