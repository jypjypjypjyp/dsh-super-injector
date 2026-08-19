/**
 * dsh-super-injector 插件管理卡片（官方“插件配置”页的 `settings.plugin.item`）。
 * 功能：已注入插件列表 + 一键卸载 + 添加（路径输入/拖放提示）——
 *   - 直接注入：目录已是插件包（package.json + lib/）→ 立即注入
 *   - 内化：任意文件夹 → 新建 agent 会话 → AI 把内容变成插件
 * 通信：同源 fetch → host webServer API（/super-injector/api）
 *
 * 卡片形态参考官方 PluginCard：可折叠标题 + 描述 + 展开内容；但内容为
 * 操作型 UI（注入/卸载），不写入 settings 字段，因此不包含保存/丢弃表单。
 */
import React, { useEffect, useState } from 'react'

const API = '/super-injector/api'

interface Entry {
  name: string
  dir: string
  active: boolean
}

interface ListStats {
  inject?: { ok?: number; fail?: number }
  reload?: { ok?: number }
  uninject?: { ok?: number; fail?: number }
}

const styles = `
.spi-card{border:1px solid var(--dsw-alias-border-l2, #333);border-radius:10px;overflow:hidden}
.spi-head{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;box-sizing:border-box;background:transparent;border:0;color:var(--dsw-alias-label-primary,#ddd);cursor:pointer;font:inherit;text-align:left}
.spi-head .spi-title{font-size:13px;font-weight:600}
.spi-head .spi-desc{color:var(--dsw-alias-label-tertiary,#888);font-size:11px;margin-top:2px}
.spi-head .spi-chev{flex:none;margin-left:auto;color:var(--dsw-alias-label-tertiary,#888);transition:transform .15s ease}
.spi-head .spi-chev.open{transform:rotate(180deg)}
.spi-body{padding:0 14px 14px;border-top:1px solid var(--theme-border,#333)}
.spi-add{border:1.5px dashed var(--theme-border,#555);border-radius:8px;padding:12px;margin:14px 0 12px;text-align:center;color:var(--theme-text-secondary,#999)}
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
.spi-stats{color:var(--theme-text-secondary,#888);font-size:11px;margin:10px 0}
`

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return fetch(API + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  }).then((r) => r.json())
}

/** 折叠卡片标题：与官方配置卡片同列表视觉，但内容为操作型 UI。 */
export function PluginManagerTab(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState('')
  const [msg, setMsg] = useState<{ text: string; isErr: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [path, setPath] = useState('')

  const refresh = async (): Promise<void> => {
    try {
      const d = await fetchJson<{ ok: boolean; entries: Entry[]; stats?: Partial<ListStats> }>('/list')
      if (!d?.ok) {
        setMsg({ text: JSON.stringify(d), isErr: true })
        return
      }
      const s = d.stats ?? {}
      setStats(
        `inject ${s.inject?.ok ?? 0}✓/${s.inject?.fail ?? 0}✗ · ` +
        `reload ${s.reload?.ok ?? 0}✓ · ` +
        `uninject ${s.uninject?.ok ?? 0}✓/${s.uninject?.fail ?? 0}✗ · 共 ${d.entries.length} 个注入插件`,
      )
      setEntries(d.entries)
    } catch (err) {
      setMsg({ text: '加载失败: ' + String(err), isErr: true })
    }
  }

  useEffect(() => {
    if (!open) return
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 60000)
    return () => window.clearInterval(timer)
  }, [open])

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
    <div className="spi-card">
      <style>{styles}</style>
      <button
        type="button"
        className="spi-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span className="spi-title">插件管理</span>
          <span className="spi-desc">运行时注入的本地插件：直接注入 / 内化 / 卸载</span>
        </span>
        <span className={'spi-chev' + (open ? ' open' : '')}>▼</span>
      </button>

      {open && (
        <div className="spi-body">
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
              <li className="spi-item">（暂无注入插件——展开后输入路径或拖入文件夹开始）</li>
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
      )}
    </div>
  )
}