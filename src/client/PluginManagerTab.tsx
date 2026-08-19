/**
 * dsh-super-injector 插件管理 tab（官方 Plugins settings section 的 tab）。
 * 功能：已注入插件列表 + 一键卸载 + 添加（路径输入/拖放提示）——
 *   - 直接注入：目录已是插件包（package.json + lib/）→ 立即注入
 *   - 内化：任意文件夹 → 新建 agent 会话 → AI 把内容变成插件
 * 通信：同源 fetch → host webServer API（/super-injector/api）
 *
 * 迁移自旧 vanilla-DOM settings.section 页面；外部 API 契约不变：
 * /list、/ingest、/inject、/uninstall，60s 轮询刷新。
 */
import React, { useEffect, useRef, useState } from 'react'

const API = '/super-injector/api'

interface Entry {
  name: string
  dir: string
  active: boolean
}

interface ListResult {
  ok: boolean
  entries: Entry[]
  stats?: {
    inject?: { ok?: number; fail?: number }
    reload?: { ok?: number }
    uninject?: { ok?: number; fail?: number }
  }
}

const styles = `
.spi-page{font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;padding:14px 16px;max-width:720px}
.spi-page h3{margin:0 0 8px;font-size:13px}
.spi-add{border:1.5px dashed var(--theme-border,#555);border-radius:8px;padding:12px;margin-bottom:14px;text-align:center;color:var(--theme-text-secondary,#999)}
.spi-add.drag{border-color:var(--theme-accent,#4a9eff);background:rgba(74,158,255,.08)}
.spi-row{display:flex;gap:6px;margin-top:10px}
.spi-input{flex:1;background:var(--theme-input-bg,#111);color:var(--theme-text,#ddd);border:1px solid var(--theme-border,#333);border-radius:6px;padding:6px 8px;font-size:12px}
.spi-btn{background:var(--theme-accent,#4a9eff);color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;white-space:nowrap}
.spi-btn.ghost{background:transparent;border:1px solid var(--theme-border,#444);color:var(--theme-text,#ccc)}
.spi-btn.danger{background:transparent;border:1px solid #d33;color:#d33}
.spi-btn:disabled{opacity:.45;cursor:not-allowed}
.spi-list{list-style:none;margin:0;padding:0}
.spi-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--theme-border,#333);border-radius:8px;margin-bottom:6px}
.spi-item .name{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spi-item .dir{color:var(--theme-text-secondary,#888);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%}
.spi-item .st{font-size:10px;padding:2px 6px;border-radius:10px}
.spi-item .st.on{background:rgba(46,204,113,.15);color:#2ecc71}
.spi-item .st.off{background:rgba(255,193,7,.12);color:#f1c40f}
.spi-msg{margin-top:10px;padding:8px 10px;border-radius:6px;background:var(--theme-input-bg,#111);border:1px solid var(--theme-border,#333);white-space:pre-wrap;max-height:180px;overflow:auto;font-size:11px}
.spi-stats{color:var(--theme-text-secondary,#888);font-size:11px;margin:0 0 10px}
`

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return fetch(API + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  }).then((r) => r.json())
}

export function PluginManagerTab(): React.JSX.Element {
  const [entries, setEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState('')
  const [msg, setMsg] = useState<{ text: string; isErr: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [path, setPath] = useState('')

  const refresh = async (): Promise<void> => {
    try {
      const d = await fetchJson<{ ok: boolean; entries: Entry[]; stats?: ListStats }>('/list')
      if (!d?.ok) {
        setMsg({ text: JSON.stringify(d), isErr: true })
        return
      }
      const s = d.stats
      setStats(
        `inject ${s?.inject?.ok ?? 0}✓/${s?.inject?.fail ?? 0}✗ · ` +
        `reload ${s?.reload?.ok ?? 0}✓ · ` +
        `uninject ${s?.uninject?.ok ?? 0}✓/${s?.uninject?.fail ?? 0}✗ · 共 ${d.entries.length} 个注入插件`,
      )
      setEntries(d.entries)
    } catch (err) {
      setMsg({ text: '加载失败: ' + String(err), isErr: true })
    }
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const doAction = async (pathName: string, label: string): Promise<void> => {
    const dir = path.trim()
    if (!dir) {
      setMsg({ text: '请先输入文件夹路径', isErr: true })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetchJson<{ ok?: boolean; result?: string }>(pathName, {
        method: 'POST',
        body: JSON.stringify({ dir, title: label }),
      })
      setMsg({ text: r?.result ?? JSON.stringify(r), isErr: !r?.ok })
      if (r?.ok) setTimeout(() => { void refresh() }, 1200)
    } catch (err) {
      setMsg({ text: '请求失败: ' + String(err), isErr: true })
    } finally {
      setBusy(false)
    }
  }

  const uninstall = async (name: string): Promise<void> => {
    setMsg(null)
    try {
      const r = await fetchJson<{ ok?: boolean; result?: string }>('/uninstall', {
        method: 'POST',
        body: JSON.stringify({ match: name }),
      })
      setMsg({ text: r?.result ?? JSON.stringify(r), isErr: !r?.ok })
      setTimeout(() => { void refresh() }, 600)
    } catch (err) {
      setMsg({ text: '卸载请求失败: ' + String(err), isErr: true })
    }
  }

  return (
    <div className="spi-page">
      {/* 内联样式：官方 Plugins section 不会注入本插件样式，直接挂 style 标签 */}
      <style>{styles}</style>
      <h3>插件管理（dsh-super-injector）</h3>
      <p className="spi-stats">{stats}</p>

      <div
        className={'spi-add' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          setPath('')
          setMsg({ text: '浏览器无法读取拖入文件夹的绝对路径——请粘贴路径或使用选择器', isErr: false })
        }}
      >
        拖入文件夹，或输入路径——「内化」= 新建会话让 AI 把内容变成插件；「注入」= 目录已是插件包直接注入
        <div className="spi-row">
          <input
            className="spi-input"
            placeholder="D:/path/to/folder"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button className="spi-btn" disabled={busy} onClick={() => { void doAction('/ingest', '内化插件') }}>
            {busy ? '处理中…' : '内化（AI 造插件）'}
          </button>
          <button className="spi-btn ghost" disabled={busy} onClick={() => { void doAction('/inject', '直接注入') }}>
            {busy ? '处理中…' : '直接注入'}
          </button>
        </div>
      </div>

      <ul className="spi-list">
        {entries.length === 0 ? (
          <li className="spi-item">（暂无注入插件——拖入文件夹或输入路径开始）</li>
        ) : (
          entries.map((e) => (
            <li key={e.name + e.dir} className="spi-item">
              <span className="name">{e.name}</span>
              <span className="dir">{e.dir}</span>
              <span className={'st ' + (e.active ? 'on' : 'off')}>{e.active ? '运行中' : '未激活'}</span>
              <button className="spi-btn danger" onClick={() => { void uninstall(e.name) }}>
                卸载
              </button>
            </li>
          ))
        )}
      </ul>

      {msg && (
        <div
          className="spi-msg"
          style={{ display: 'block', borderColor: msg.isErr ? '#d33' : 'var(--theme-border,#333)' }}
        >
          {msg.text}
        </div>
      )}
    </div>
  )
}

interface ListStats {
  inject?: { ok?: number; fail?: number }
  reload?: { ok?: number }
  uninject?: { ok?: number; fail?: number }
}