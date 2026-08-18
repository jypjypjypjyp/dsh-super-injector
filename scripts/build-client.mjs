// Router Observer client 构建器：esbuild CJS + ModuleLoader wrapper（vqa-dual-agent 同款契约）。
// 关键：DSH ClientModuleLoader 的 require 只解析 seed/shell/factory；react 是 platform seed word，
// react/jsx-runtime 不是。因此 JSX 必须用 transform 模式编译为 import_react.default.createElement，
// 且只 external react（绝不 external react/jsx-runtime）。
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const ENTRY = join(ROOT, 'src/client/index.ts')
const OUTPUT = join(ROOT, 'lib/client.js')

function resolveEsbuildBin() {
  const candidates = [
    join(ROOT, 'node_modules/.bin/esbuild'),
    join(ROOT, 'node_modules/esbuild/bin/esbuild'),
    '/Users/a1234/Library/CloudStorage/OneDrive-个人/Documents/鲸鱼娘/vqa-dual-agent/node_modules/.bin/esbuild',
  ]
  for (const c of candidates) {
    try { if (statSync(c).isFile()) return c } catch { /* next */ }
  }
  return null
}

export function generate({ check = false, root = ROOT } = {}) {
  const esbuildBin = resolveEsbuildBin()
  if (esbuildBin === null) return { ok: false, errors: ['esbuild 不可用: 安装 esbuild 或提供 vqa-dual-agent 路径'] }
  const tmpDir = mkdtempSync(join(tmpdir(), 'dsh-super-injector-'))
  const tmpOut = join(tmpDir, 'client.js')
  const res = spawnSync(esbuildBin, [
    ENTRY, '--bundle', '--format=cjs', '--platform=browser', '--target=es2020',
    '--jsx=transform', // 关键：不用 automatic，避免 require("react/jsx-runtime")
    '--external:react', // react 是 DSH platform seed word
    '--external:@deepseek-ai/dsh-client-ui-slots',
    `--outfile=${tmpOut}`,
  ], { cwd: root, encoding: 'utf8' })
  if (res.status !== 0) return { ok: false, errors: [`esbuild 失败:${res.stderr.trim()}`] }
  const body = readFileSync(tmpOut, 'utf8')
  // 构建后自检：禁止出现 react/jsx-runtime require（DSH 不提供）
  if (body.includes('react/jsx-runtime')) return { ok: false, errors: ['构建产物引用了 react/jsx-runtime（DSH ModuleLoader 不提供）——必须用 --jsx=transform'] }
  const code = `window.__ModuleLoader__.load({\n\tid: "@dsh-external/dsh-super-injector",\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n${body.replace(/\n$/, '')}\n\t\treturn module.exports;\n\t}\n});\n`
  const outputPath = join(root, 'lib', 'client.js')
  if (!check) {
    writeFileSync(outputPath, code)
    return { ok: true }
  }
  let committed = null
  try { committed = readFileSync(outputPath) } catch { return { ok: false, errors: [`${outputPath} 不存在: 运行 node scripts/build-client.mjs 生成`] } }
  if (Buffer.compare(committed, code) !== 0) return { ok: false, errors: ['client.js 与生成器输出不一致: 运行 node scripts/build-client.mjs 重新生成'] }
  return { ok: true }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes('--check')
  const result = generate({ check })
  if (!result.ok) { for (const e of result.errors ?? []) console.error(`[build-client] ${e}`); process.exit(1) }
  console.log(check ? '[build-client] client.js 新鲜(--check OK)' : '[build-client] client.js 已生成')
}
