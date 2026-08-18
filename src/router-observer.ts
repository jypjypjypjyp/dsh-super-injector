import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'

export type RouterCoreSource = { kind: 'installed' | 'mirror'; hash: string; match: boolean }

export interface RouterCore {
  classifyTask(text: string): unknown
  bandOf(mode: unknown): string
  personaFor(mode: unknown, modelId: string): string
  coreFor(mode: unknown): string[]
  testinessFor(mode: unknown): string
  isFlashModel(m?: string): boolean
  isComplexTask(text: string): boolean
  extractText(data: unknown): string
  sessionMode(session: unknown): unknown
  parseMode(token: unknown): unknown
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

const MIRROR = fileURLToPath(new URL('./router-core.fixture.mjs', import.meta.url))

export async function resolveRouterCore(): Promise<{ core: RouterCore; source: RouterCoreSource }> {
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  const installed = join(dshHome, '.agent-presets', 'router-standard', 'router-core.mjs')
  if (existsSync(installed)) {
    const text = readFileSync(installed, 'utf8')
    const hash = sha256(text)
    // 反向依赖镜像：本地 mirror 与其内容的哈希自洽
    const mirrorText = readFileSync(MIRROR, 'utf8')
    const match = hash === sha256(mirrorText)
    const mod = await import(pathToFileURL(installed).href)
    return { core: normalize(mod), source: { kind: 'installed', hash, match } }
  }
  const text = readFileSync(MIRROR, 'utf8')
  const hash = sha256(text)
  const mod = await import(pathToFileURL(MIRROR).href)
  return { core: normalize(mod), source: { kind: 'mirror', hash, match: true } }
}

function normalize(mod: any): RouterCore {
  return {
    classifyTask: mod.classifyTask,
    bandOf: mod.bandOf,
    personaFor: mod.personaFor,
    coreFor: mod.coreFor,
    testinessFor: mod.testinessFor,
    isFlashModel: mod.isFlashModel,
    isComplexTask: mod.isComplexTask,
    sessionMode: mod.sessionMode,
    extractText: mod.extractText,
    parseMode: mod.parseMode,
  }
}
export type RouterEventType = 'route' | 'promote' | 'tool' | 'guide' | 'calibrate' | 'baseline'
export interface RouterTimelineEvent {
  seq: number; ts: number; sessionId: string; type: RouterEventType
  band: string; mode: string | number; source: 'observed'|'derived'|'baseline'|'calibrated'
  override: string | number | null; detail?: string
}

export class RouterTimeline {
  private buf: RouterTimelineEvent[] = []
  private limit: number
  constructor(limit = 200) { this.limit = limit }
  get windowStart(): boolean { return this.buf.length === this.limit }
  push(e: RouterTimelineEvent): void { this.buf.push(e); if (this.buf.length > this.limit) this.buf.shift() }
  snapshot(): RouterTimelineEvent[] { return this.buf.slice() }
}

export interface SessionView {
  sessionId: string
  mode: string | number
  band: string
  override: string | number | null
  confidence: 'high' | 'low'
  observed: number
  processed: number
  drift: number
  lastEventAt: number | null
  source: RouterTimelineEvent['source']
  model?: string
  timeline: RouterTimeline
}

export class RouterObserverState {
  private map = new Map<string, SessionView>()
  /** 实际解析来源，Task 3 装配时赋值；默认 mirror。 */
  srcKind: RouterCoreSource['kind'] = 'mirror'
  private core: RouterCore
  private limit: number
  constructor(core: RouterCore, limit = 200) { this.core = core; this.limit = limit }
  private view(id: string): SessionView {
    let v = this.map.get(id)
    if (!v) {
      v = { sessionId:id, mode:'weak', band:'weak', override:null, confidence:'high',
            observed:0, processed:0, drift:0, lastEventAt:null, source:'baseline',
            timeline: new RouterTimeline(this.limit) }
      this.map.set(id, v)
    }
    return v
  }
  route(session: string, mode: string|number, modelId: string): void {
    const v = this.view(session)
    const band = this.core.bandOf(mode)
    v.mode = mode; v.band = band; v.source = 'derived'
    v.lastEventAt = Date.now(); v.processed++
    v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'route',
      band, mode, source:'derived', override: v.override ?? null })
    if (this.core.isFlashModel?.(modelId)) v.model = modelId
  }
  promote(session: string, tool: string): void {
    const v = this.view(session)
    v.lastEventAt = Date.now(); v.processed++
    v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'promote',
      band:v.band, mode:v.mode, source:'observed', override:v.override ?? null, detail:tool })
  }
  markObserved(session: string): void {
    const v = this.view(session)
    v.observed++
  }
  tool(session: string, name: string, arg: unknown): void {
    const v = this.view(session); v.processed++; v.lastEventAt = Date.now()
    if (name === 'dev_router_mode') {
      const parsed = this.core.parseMode?.(String(arg)) ?? (typeof arg === 'string' ? arg : null)
      if (parsed === 'auto') v.override = null
      else v.override = parsed
      v.source = 'observed'
      v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'tool',
        band:this.core.bandOf(parsed ?? v.mode), mode: v.mode, source:'observed', override:v.override, detail:name })
    } else {
      v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'tool',
        band:v.band, mode:v.mode, source:'observed', override:v.override ?? null, detail:name })
    }
  }
  calibrate(session: string, parsed: { mode?: string|number; override?: string|number|null }): void {
    const v = this.view(session)
    if (parsed.override !== undefined && parsed.override !== null) {
      v.mode = parsed.mode ?? v.mode; v.band = this.core.bandOf(parsed.override); v.override = parsed.override
      v.source = 'calibrated'; v.confidence = 'high'
      v.timeline.push({ seq:++v.processed, ts:Date.now(), sessionId:session, type:'calibrate',
        band:v.band, mode:v.mode, source:'calibrated', override:v.override })
    } else if (parsed.mode !== undefined && parsed.mode !== null) {
      v.mode = parsed.mode; v.band = this.core.bandOf(parsed.mode); v.override = parsed.mode
      v.source = 'calibrated'; v.confidence = 'high'
      v.timeline.push({ seq:++v.processed, ts:Date.now(), sessionId:session, type:'calibrate',
        band:v.band, mode:v.mode, source:'calibrated', override:v.override })
    } else {
      v.confidence = 'low'
    }
  }
  drift(session: string, expected: string, actual: string): void {
    const v = this.view(session); v.drift++; v.confidence = 'low'; v.lastEventAt = Date.now(); v.processed++
    v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'guide',
      band:v.band, mode:v.mode, source:'observed', override:v.override ?? null, detail:`drift ${expected}≠${actual}` })
  }
  snapshot(session: string): SessionView | undefined { return this.map.get(session) }
  sessions(): SessionView[] { return [...this.map.values()] }
  debug(session: string): object {
    const v = this.view(session)
    return { source:{ resolved: this.srcKind }, events:{observed:v.observed,processed:v.processed,drift:v.drift},
      state:{mode:v.mode,band:v.band,override:v.override,confidence:v.confidence} }
  }
}

export async function createRouterObserver(ctx: any): Promise<{ state: RouterObserverState; dispose: () => void; selftest: () => Promise<{ ok: boolean; problems: string[] }>; core: RouterCore }> {
  const { core, source } = await resolveRouterCore()
  const state = new RouterObserverState(core)
  state.srcKind = source.kind // 供 debug()

  // session 事件订阅（ctx.on 是 cordis 事件总线；事件名由 DSH session 提供）
  const sub = ctx.on('session/event', (session: any, event: any) => {
    if (!session?.id) return
    const sid = session.id
    state.markObserved(sid)
    const ev = event?.type ?? ''
    if (ev === 'user/message') {
      const text = core.extractText?.(event.data)
      if (!text) return
      const mode = core.classifyTask(text)
      state.route(sid, mode, session.header?.model ?? agentModelOf(ctx))
    } else if (ev === 'tool/call') {
      const name = event.data?.name ?? ''
      if (name === 'dev_router_mode' || name === 'dev_router_status') {
        state.tool(sid, name, event.data?.arguments)
      } else { state.promote(sid, name) }
    } else if (ev === 'tool/result' && event?.name === 'dev_router_status') {
      // 免费校准：解析 dev_router_status 返回文本，作为该会话此后时间线的最高可信源
      const text = String(event?.data?.output ?? '')
      const mode = /mode=([\d.]+|weak)/.exec(text)?.[1]
      const override = /override=(\w+)/.exec(text)?.[1] ?? null
      state.calibrate(sid, { mode, override })
    }
  })
  const selftest = async () => {
    const problems: string[] = []
    if (core.classifyTask('写一个 Web 爬虫') !== 1) problems.push('classify react failed')
    if (core.classifyTask('修复崩溃') !== 0) problems.push('classify spec failed')
    return { ok: problems.length === 0, problems }
  }
  return { state, dispose: sub, selftest, core }
}

function agentModelOf(ctx: any): string {
  try { return ctx.get('agent')?.options?.model ?? '' } catch { return '' }
}

/** 从 SessionView + RouterCore 派生 persona（spec §6 快照卡人设摘要用）。 */
export function personaOf(s: SessionView, core: RouterCore): string {
  try { return core.personaFor(s.mode, s.model ?? '') } catch { return '' }
}

/** 从 SessionView + RouterCore 派生首轮核心工具名（spec §6 快照卡用）。 */
export function coreNamesOf(s: SessionView, core: RouterCore): string[] {
  try { return core.coreFor(s.mode) } catch { return [] }
}