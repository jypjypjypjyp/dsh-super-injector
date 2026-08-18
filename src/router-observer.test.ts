import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRouterCore, sha256 } from './router-observer.ts'

test('sha256 returns hex digest', () => {
  const h = sha256('abc')
  assert.match(h, /^[0-9a-f]{64}$/)
  assert.equal(h, createHash('sha256').update('abc').digest('hex'))
})

test('resolveRouterCore returns mirror when DSH_HOME has no installed router-core', async () => {
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

test('resolveRouterCore returns installed when DSH_HOME has an installed router-core', async () => {
  const prevDSHHome = process.env.DSH_HOME
  const root = tmpdir() + '/router-observer-test-' + Date.now()
  const presetDir = path.join(root, '.agent-presets', 'router-standard')
  mkdirSync(presetDir, { recursive: true })
  cpSync(fileURLToPath(new URL('./router-core.fixture.mjs', import.meta.url)), path.join(presetDir, 'router-core.mjs'))
  process.env.DSH_HOME = root
  try {
    const { core, source } = await resolveRouterCore()
    assert.ok(core.classifyTask)
    assert.equal(typeof core.classifyTask('写一个爬虫'), 'number') // react → 1
    assert.equal(source.kind, 'installed')
    assert.match(source.hash, /^[0-9a-f]{64}$/)
    assert.equal(source.match, true)
  } finally {
    if (prevDSHHome === undefined) {
      delete process.env.DSH_HOME
    } else {
      process.env.DSH_HOME = prevDSHHome
    }
  }
})