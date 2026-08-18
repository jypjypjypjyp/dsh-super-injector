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