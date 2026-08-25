import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRouterCore, sha256, RouterTimeline, RouterObserverState, createRouterObserver, type RouterTimelineEvent, type RouterCore } from './router-observer.js'

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
  parseMode: (t) => (t === 'auto' ? 'auto' : String(t)),
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

test('calibrate mode-only sets source calibrated + pushes event, leaves override null', () => {
  const state = new RouterObserverState(stubCore)
  // 先确立一个已存在的 override，验证 mode-only 分支不覆盖它
  state.tool('s', 'dev_router_mode', 'react') // override='react'
  state.calibrate('s', { mode: 0 })
  const snap = state.snapshot('s')!
  assert.equal(snap.source, 'calibrated')
  assert.equal(snap.confidence, 'high')
  assert.equal(snap.override, 'react') // mode-only 分支不 claim override，保持原状
  const events = snap.timeline.snapshot()
  const ev = events[events.length - 1]
  assert.equal(ev.type, 'calibrate')
  assert.equal(ev.source, 'calibrated')
  assert.equal(ev.mode, 0)
  assert.equal(ev.override, 'react')
})

test('calibrate mode-only without prior override keeps override null', () => {
  const state = new RouterObserverState(stubCore)
  state.calibrate('s2', { mode: 0 })
  const snap = state.snapshot('s2')!
  assert.equal(snap.source, 'calibrated')
  assert.equal(snap.confidence, 'high')
  assert.equal(snap.override, null) // override=no 不得 claim override 值
  const ev = snap.timeline.snapshot()[0]
  assert.equal(ev.type, 'calibrate')
  assert.equal(ev.override, null)
})

test('createObserver derives route from user message event', async () => {
  const { state } = await createRouterObserver({ on: () => () => {}, get: () => undefined })
  state.route('s1', 1, 'deepseek-v4-flash-0731-anthropic')
  const s = state.snapshot('s1')!
  assert.equal(s.band, 'react')
  assert.equal(s.mode, 1)
})

test('session/event user+tool dispatch through subscription', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  assert.equal(typeof captured, 'function')
  // user/message → predictable band ('写一个 Web 爬虫' → react)
  captured(
    { id: 's1', header: { model: 'deepseek-v4-pro' } },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '写一个 Web 爬虫' }] } },
  )
  const s = state.snapshot('s1')!
  assert.equal(s.band, 'react')
  assert.equal(s.mode, 1)
  assert.equal(s.source, 'derived')
  // dev_router_mode tool/call → override recorded through the real subscription
  captured(
    { id: 's1', header: { model: 'deepseek-v4-pro' } },
    { type: 'tool/call', data: { name: 'dev_router_mode', arguments: 'react' } },
  )
  const s2 = state.snapshot('s1')!
  assert.equal(s2.override, 1) // parseMode('react') → 1
  assert.equal(s2.source, 'observed')
  const events = s2.timeline.snapshot()
  assert.equal(events.length, 2)
  assert.equal(events[0].type, 'route')
  assert.equal(events[1].type, 'tool')
  assert.equal(events[1].detail, 'dev_router_mode')
})
test('dev_router_status text 解析 → override calibrated', async () => {
  const { core } = await resolveRouterCore()
  const st = new RouterObserverState(core)
  st.tool('s1', 'dev_router_status', {})
  st.calibrate('s1', { mode: 0, override: 0 })
  const s = st.snapshot('s1')!
  assert.equal(s.override, 0); assert.equal(s.source, 'calibrated'); assert.equal(s.confidence, 'high')
})
test('dev_router_status tool/result 经订阅解析 override=yes → calibrated', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  assert.equal(typeof captured, 'function')
  // override=yes：mode 行 "react" 即 override 值
  captured(
    { id: 's3', header: { model: 'deepseek-v4-pro' } },
    { type: 'tool/result', name: 'dev_router_status', data: { output: 'router-mode=standard\nmode=react (band=react)\npersona=…\ncore=[…]\ntestiness=…\noverride=yes' } },
  )
  const s = state.snapshot('s3')!
  assert.equal(s.source, 'calibrated')
  assert.ok(s.override) // mode "react" → parseMode → 1，truthy
  assert.equal(s.confidence, 'high')
})
test('dev_router_status tool/result 经订阅解析 override=no → override null', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  assert.equal(typeof captured, 'function')
  // override=no：只记录观测/推导模式，不 claim override
  captured(
    { id: 's4', header: { model: 'deepseek-v4-pro' } },
    { type: 'tool/result', name: 'dev_router_status', data: { output: 'router-mode=standard\nmode=0.30 (band=mixed)\npersona=…\ncore=[…]\ntestiness=…\noverride=no' } },
  )
  const s = state.snapshot('s4')!
  assert.equal(s.source, 'calibrated')
  // override=no 时不得把字面量 "no" 当成 override 值（旧 bug）；mode-only 分支记录 mode 而非 "no"
  assert.notEqual(s.override, 'no')
  assert.notEqual(s.override, 'yes')
  assert.equal(s.mode, 0.3)
  assert.equal(s.band, 'transition') // 0.30 → transition band（bandOf 输出）
})
test('不一致标记 drift + low', async () => {
  const { core } = await resolveRouterCore()
  const st = new RouterObserverState(core)
  st.route('s2', 'react', '')
  st.drift('s2','0','1')
  const s = st.snapshot('s2')!; assert.equal(s.drift, 1); assert.equal(s.confidence, 'low')
})

test('dev_mode_subagent tool/call → tool event, not promote', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  assert.equal(typeof captured, 'function')
  // dev_mode_subagent 必须走 tool 事件（spec §11.4），而非 promote
  captured(
    { id: 's5', header: { model: 'deepseek-v4-pro' } },
    { type: 'tool/call', data: { name: 'dev_mode_subagent', arguments: { mode: 'spec', task: 'x' } } },
  )
  const s = state.snapshot('s5')!
  const events = s.timeline.snapshot()
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'tool')
  assert.equal(events[0].detail, 'dev_mode_subagent')
})

test('promote 只对首个非特殊 tool/call 触发（narrow→full）', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  assert.equal(typeof captured, 'function')
  // 两个普通 tool/call：首个记 promote，第二个不再记 promote（只记 tool）
  captured({ id: 's6' }, { type: 'tool/call', data: { name: 'some_generic_tool', arguments: {} } })
  captured({ id: 's6' }, { type: 'tool/call', data: { name: 'another_generic_tool', arguments: {} } })
  const s = state.snapshot('s6')!
  const events = s.timeline.snapshot()
  const promotes = events.filter((e) => e.type === 'promote')
  assert.equal(promotes.length, 1)
  assert.equal(promotes[0].detail, 'some_generic_tool')
})

test('debug 返回 sha-256 来源（resolved: kind:hash + match），且不存在会话返回 null', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  // 未存在会话 → null（不创建幻影会话）
  assert.equal(state.debug('ghost'), null)
  // 建立会话后 debug 返回 kind:hash + match
  captured({ id: 's7' }, { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '修复崩溃' }] } })
  const d = state.debug('s7') as any
  assert.ok(d)
  assert.match(d.source.resolved, /^(installed|mirror):[0-9a-f]{64}$/)
  assert.equal(typeof d.source.match, 'boolean')
  assert.ok(d.events && d.state)
})

test('drift-on-mismatch：状态已确立且不一致 → drift 事件 + confidence low', async () => {
  let captured: any
  const { state } = await createRouterObserver({
    on: (_ev: string, h: any) => { captured = h; return () => {} },
    get: () => undefined,
  })
  // 先确立 derived 状态（react）
  captured(
    { id: 's8', header: { model: 'deepseek-v4-pro' } },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '写一个 Web 爬虫' }] } },
  )
  // 校准结果与 derived 不一致（spec 而非 react）→ drift + low
  captured(
    { id: 's8', header: { model: 'deepseek-v4-pro' } },
    { type: 'tool/result', name: 'dev_router_status', data: { output: 'router-mode=standard\nmode=spec (band=spec)\npersona=…\ncore=[…]\ntestiness=…\noverride=no' } },
  )
  const s = state.snapshot('s8')!
  const all = s.timeline.snapshot()
  const guide = all.find((e) => e.type === 'guide')
  assert.ok(guide, '应有 drift(guide) 事件')
  assert.ok((guide.detail || '').includes('drift'))
  assert.equal(s.drift, 1)
  assert.equal(s.confidence, 'low')
})
