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
  /** 实际解析来源完整信息（kind + SHA-256 + match），装配时赋值；debug() 使用。 */
  srcInfo: RouterCoreSource | null = null
  /** 已触发过 promote（窄→全目录提升）的会话集合：只对首个非特殊 tool/call 发 once。 */
  private promoted = new Set<string>()
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
    if (this.promoted.has(session)) return  // 只对首个非特殊 tool/call 提升
    this.promoted.add(session)
    const v = this.view(session)
    v.lastEventAt = Date.now(); v.processed++
    v.timeline.push({ seq:v.processed, ts:v.lastEventAt, sessionId:session, type:'promote',
      band:v.band, mode:v.mode, source:'observed', override:v.override ?? null, detail:tool })
  }
  /** 标记 promote 已触发（当首个非特殊 tool/call 经其他路径处理时）。 */
  markPromoted(session: string): void { this.promoted.add(session) }
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
      // override 即有效 mode：band 与 mode 都从 override 一致计算，避免混合赋值
      v.mode = parsed.override; v.band = this.core.bandOf(parsed.override); v.override = parsed.override
      v.source = 'calibrated'; v.confidence = 'high'
      v.timeline.push({ seq:++v.processed, ts:Date.now(), sessionId:session, type:'calibrate',
        band:v.band, mode:v.mode, source:'calibrated', override:v.override })
    } else if (parsed.mode !== undefined && parsed.mode !== null) {
      // mode-only 分支 = 校准"观测/推导出的模式"，并非声明 override：
      // 调用方未传 override 时不 claim override 值（保持 override 原状）。
      v.mode = parsed.mode; v.band = this.core.bandOf(parsed.mode)
      v.source = 'calibrated'; v.confidence = 'high'
      v.timeline.push({ seq:++v.processed, ts:Date.now(), sessionId:session, type:'calibrate',
        band:v.band, mode:v.mode, source:'calibrated', override:v.override ?? null })
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
  debug(session: string): object | null {
    // 不创建幻影会话：会话不存在时返回 null（API 层 404）。
    const v = this.map.get(session)
    if (!v) return null
    const resolved = this.srcInfo ? `${this.srcInfo.kind}:${this.srcInfo.hash}` : 'unknown'
    return { source:{ resolved, match: this.srcInfo?.match ?? null }, events:{observed:v.observed,processed:v.processed,drift:v.drift},
      state:{mode:v.mode,band:v.band,override:v.override,confidence:v.confidence} }
  }
}

export async function createRouterObserver(ctx: any): Promise<{ state: RouterObserverState; dispose: () => void; selftest: () => Promise<{ ok: boolean; problems: string[] }>; core: RouterCore }> {
  const { core, source } = await resolveRouterCore()
  const state = new RouterObserverState(core)
  state.srcKind = source.kind // 供 debug()
  state.srcInfo = source // 供 debug() 完整来源（kind + SHA-256 + match）

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
      // spec §11.4：dev_router_mode / dev_router_status / dev_mode_subagent → tool 事件；
      // 其余非特殊 tool/call 走 promote（窄→全目录提升），且 promote 只对首个触发。
      if (name === 'dev_router_mode' || name === 'dev_router_status' || name === 'dev_mode_subagent') {
        state.tool(sid, name, event.data?.arguments)
      } else { state.promote(sid, name) }
    } else if (ev === 'tool/result' && event?.name === 'dev_router_status') {
      // 免费校准：解析 dev_router_status 返回文本，作为该会话此后时间线的最高可信源
      // 真实输出形如 `mode=<fmtMode> (band=<bandFor>)\noverride=yes|no`：
      // mode 行携带模式值（0.00/0.30/1.00/weak 或 band 名），override 只是布尔指示器。
      const text = String(event?.data?.output ?? '')
      // 锚定到独立的 `mode=<...>` 行（避免误匹配首行 `router-mode=...`）
      const modeToken = /^mode=(\S+)/m.exec(text)?.[1]
      const mode = core.parseMode?.(modeToken) ?? modeToken
      const hasOverride = /override=(yes|no)/.exec(text)?.[1] === 'yes'
      const parsedOverride = hasOverride ? mode : null
      // 一致性对比（spec §5/§11.5 drift-on-mismatch）：解析结果与旁路推导状态比较，
      // 不一致时先发射 drift（confidence→low），再覆盖为校准态。
      const pre = state.snapshot(sid)
      let mismatch = false
      // 仅对"已确立"状态（非 baseline）做一致性对比：fresh 会话的首条校准结果
      // 是基线确立，不与默认 weak 基线做 drift 对比。
      if (pre && pre.source !== 'baseline') {
        const modeDiff = parsedModeValue(mode) !== normalizedMode(pre.mode)
        const overrideDiff = hasOverride !== (pre.override != null)
        mismatch = modeDiff || overrideDiff
        if (mismatch) {
          state.drift(sid, String(pre.mode), String(parsedModeValue(mode)))
        }
      }
      // override=yes 时，mode 行就是 override 值；override=no/缺省时只记录观测模式，不claim override。
      state.calibrate(sid, { mode, override: hasOverride ? mode : null })
      // drift 把 confidence 置 low；若非一致命中，calibrate 会置回 high。为满足
      // spec（mismatch → drift 事件 + confidence low），校准后显式压回 low。
      if (mismatch) {
        const after = state.snapshot(sid); if (after) after.confidence = 'low'
      }
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

/** 把解析出的 mode 规约为可比对的值（weak 保持字符串，数字取数值）。 */
function parsedModeValue(mode: unknown): unknown {
  return typeof mode === 'number' ? mode : String(mode)
}

/** 把状态里的 mode 规约为与 parsedModeValue 可比对的形式。 */
function normalizedMode(mode: string | number): unknown {
  return typeof mode === 'number' ? mode : String(mode)
}

/** 从 SessionView + RouterCore 派生 persona（spec §6 快照卡人设摘要用）。 */
export function personaOf(s: SessionView, core: RouterCore): string {
  try { return core.personaFor(s.mode, s.model ?? '') } catch { return '' }
}

/** 从 SessionView + RouterCore 派生首轮核心工具名（spec §6 快照卡用）。 */
export function coreNamesOf(s: SessionView, core: RouterCore): string[] {
  try { return core.coreFor(s.mode) } catch { return [] }
}