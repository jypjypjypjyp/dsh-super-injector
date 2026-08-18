import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRouterCore, sha256, RouterTimeline, RouterObserverState, createRouterObserver, type RouterTimelineEvent, type RouterCore } from './router-observer.ts'

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
let __seq = 0
const e = (band: string): RouterTimelineEvent => ({
  seq: ++__seq, ts: Date.now(), sessionId: 's1', type: 'route',
  band, mode: 'weak', source: 'derived', override: null,
})

test('RouterTimeline bounds at limit', () => {
  const tl = new RouterTimeline(3)
  tl.push(e('spec')); tl.push(e('spec')); tl.push(e('spec')); tl.push(e('spec'))
  const s = tl.snapshot()
  assert.equal(s.length, 3)
  assert.equal(s[0].seq, 2)
})

const stubCore: RouterCore = {
  bandOf: (m) => (m === 0 ? 'spec' : String(m)),
  classifyTask: () => 0,
  personaFor: () => '',
  coreFor: () => [],
  testinessFor: () => '',
  isFlashModel: () => false,
  isComplexTask: () => false,
  extractText: (d) => String(d),
  sessionMode: () => 'weak',
  parseMode: (t) => (t === 'auto' ? 'auto' : t),
}

test('drift produces a unique monotonic seq', () => {
  const state = new RouterObserverState(stubCore)
  state.route('s', 'weak', 'model')
  state.drift('s', 'spec', 'react')
  const events = state.snapshot('s')!.timeline.snapshot()
  assert.equal(events.length, 2)
  const [routeEv, driftEv] = events
  assert.equal(routeEv.type, 'route')
  assert.equal(driftEv.type, 'guide')
  assert.notEqual(routeEv.seq, driftEv.seq)
  assert.ok(driftEv.seq > routeEv.seq)
})

test('calibrate mode-only sets source calibrated + pushes event', () => {
  const state = new RouterObserverState(stubCore)
  state.calibrate('s', { mode: 0 })
  const snap = state.snapshot('s')!
  assert.equal(snap.source, 'calibrated')
  assert.equal(snap.confidence, 'high')
  const events = snap.timeline.snapshot()
  assert.equal(events.length, 1)
  const ev = events[0]
  assert.equal(ev.type, 'calibrate')
  assert.equal(ev.source, 'calibrated')
  assert.equal(ev.mode, 0)
  assert.equal(ev.override, 0)
})

test('createObserver derives route from user message event', async () => {
  const { state } = await createRouterObserver({ on: () => () => {}, get: () => undefined })
  state.route('s1', 1, 'deepseek-v4-flash-0731-anthropic')
  const s = state.snapshot('s1')!
  assert.equal(s.band, 'react')
  assert.equal(s.mode, 1)
})