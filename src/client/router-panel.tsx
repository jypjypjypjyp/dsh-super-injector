import React, { useState, useEffect } from 'react'

const API = '/super-injector/api/router'

/** Tab 图标：雷达 / 分流符号（better-sidebar TabDescriptor.icon 契约）。 */
export function RoutingIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }} aria-hidden="true">
      <circle cx="8" cy="8" r="6" opacity=".45" />
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 8 L13.4 4.5" opacity=".85" />
      <path d="M8 8 L4 11" opacity=".6" />
      <path d="M8 1.6 V2.8" />
      <circle cx="8" cy="1.6" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

const BAND_COLORS: Record<string, string> = {
  spec: '#4a9eff',
  react: '#2ecc71',
  weak: '#f1c40f',
  mixed: '#e67e22',
  transition: '#e67e22',
}

const BAND_LABELS: Record<string, string> = {
  spec: 'spec',
  react: 'react',
  weak: 'weak',
  mixed: 'mixed',
  transition: 'mixed',
}

function BandBadge({ band }: { band?: string }): JSX.Element | null {
  if (!band || band === '–' || band === '') return null
  const color = BAND_COLORS[band] || '#888'
  return (
    <span style={{
      display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 9px',
      borderRadius: 10, background: color + '22', color, border: `1px solid ${color}55`,
      lineHeight: 1.4,
    }}>{BAND_LABELS[band] || band}</span>
  )
}

function SourceTag({ source }: { source?: string }): JSX.Element | null {
  if (!source) return null
  const map: Record<string, { text: string; color: string }> = {
    observed: { text: 'observed', color: '#2ecc71' },
    derived: { text: '≈ 重算', color: '#888' },
    baseline: { text: 'baseline', color: '#888' },
    calibrated: { text: 'calibrated', color: '#f1c40f' },
  }
  const s = map[source] || { text: source, color: '#888' }
  return (
    <span style={{
      fontSize: 11, padding: '1px 6px', borderRadius: 4,
      border: `1px solid ${s.color}66`, color: s.color, whiteSpace: 'nowrap',
    }}>{s.text}</span>
  )
}

export function RouterPanel({ visible, scope }: any): JSX.Element {
  const [snap, setSnap] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [dbg, setDbg] = useState<boolean>(false)
  const [dbgData, setDbgData] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let alive = true
    const sid = scope?.sessionId ?? ''
    setDbgData(null); setLoadError(null)
    const load = async () => {
      try {
        const [s, t] = await Promise.all([
          fetch(`${API}/status?sessionId=${sid}`).then(r=>r.json()),
          fetch(`${API}/timeline?sessionId=${sid}`).then(r=>r.json()),
        ])
        if (!alive) return
        if (s.ok) setSnap(s.status)
        else setSnap({ mode:'–', band:'–', override:null, source:'unknown', confidence:'low', persona:'', core: [] })
        if (t.ok) setTimeline(t.timeline || [])
        else setTimeline([])
        setLoadError(null)
      } catch (e) {
        if (!alive) return
        setLoadError(String(e instanceof Error ? e.message : e))
      }
    }
    const loadDbg = async () => {
      if (!dbg) return
      try {
        const d = await fetch(`${API}/debug?sessionId=${sid}`).then(r=>r.json())
        if (alive && d.ok) setDbgData(d.debug)
        else if (alive && !d.ok) setDbgData(null)
      } catch {}
    }
    load()
    loadDbg()
    const id = setInterval(() => { load(); loadDbg() }, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [visible, scope?.sessionId, dbg])

  const band = snap?.band || '–'
  const modeText = snap?.mode !== undefined && snap.mode !== null && snap.mode !== '' ? String(snap.mode) : '–'
  const conf = snap?.confidence || 'low'

  return (
    <div style={{ padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 14, color: 'var(--foreground)', lineHeight: 1.6 }}>
      {/* 头部 */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <strong style={{ fontSize: 15 }}>路由观测</strong>
        <span style={{
          fontSize: 12, padding: '2px 9px', borderRadius: 10, fontWeight: 600,
          background: visible ? 'rgba(46,204,113,.15)' : 'rgba(120,120,120,.15)',
          color: visible ? '#2ecc71' : 'var(--muted-foreground)',
        }}>{visible ? '● 实时' : '已暂停'}</span>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--muted-foreground)' }}>2s 轮询</span>
      </div>

      {loadError && (
        <div style={{ color:'#e5534b', fontSize:13, marginBottom:8, padding:'6px 8px', background:'rgba(229,83,75,.08)', borderRadius:6 }}>
          （加载失败：{loadError}）
        </div>
      )}

      {/* 快照卡 */}
      <div style={{ border:`1px solid var(--border)`, borderRadius:10, padding:'10px 12px', marginBottom:10, background:'var(--card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
          <div>
            <div style={{ fontSize:12, color:'var(--muted-foreground)' }}>当前模式</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
              <span style={{ fontSize:22, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{modeText}</span>
              <BandBadge band={band} />
              <SourceTag source={snap?.source} />
            </div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontSize:12, color:'var(--muted-foreground)' }}>可信度</div>
            <div style={{
              fontSize:14, fontWeight:600, marginTop:2,
              color: conf === 'high' ? '#2ecc71' : conf === 'low' ? '#f1c40f' : 'var(--muted-foreground)',
            }}>{conf}</div>
          </div>
        </div>

        <div style={{ fontSize:13, color:'var(--muted-foreground)', borderTop:'1px dashed var(--border)', paddingTop:6, marginTop:4 }}>
          <span style={{ color:'var(--muted-foreground)', fontSize:12 }}>persona · </span>
          <span>{snap?.persona ? snap.persona : '（等待路由决策）'}</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:8 }}>
          <span style={{ fontSize:12, color:'var(--muted-foreground)' }}>首轮核心工具</span>
          {(snap?.core || []).length === 0
            ? <span style={{ fontSize:13, color:'var(--muted-foreground)' }}>—</span>
            : (snap.core as string[]).map((c: string) => (
              <span key={c} style={{
                fontSize:12, padding:'1px 8px', borderRadius:5,
                background:'rgba(74,158,255,.12)', border:'1px solid rgba(74,158,255,.35)',
                color:'var(--primary)', fontFamily:'ui-monospace, monospace',
              }}>{c}</span>
            ))}
          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--muted-foreground)' }}>
            override: <b style={{ color: snap?.override != null ? '#f1c40f' : 'var(--foreground)' }}>{snap?.override ?? '无'}</b>
          </span>
        </div>
      </div>

      {/* 状态条 */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, fontSize:12, color:'var(--muted-foreground)', flexWrap:'wrap' }}>
        <span>处理率 <b style={{ color:'var(--foreground)' }}>{snap?.processed ?? '–'}</b></span>
        <span>drift <b style={{ color:'var(--foreground)' }}>{snap?.drift ?? 0}</b></span>
        <button onClick={()=>setDbg(!dbg)} style={{
          marginLeft:'auto', background:'transparent', border:'1px solid var(--border)', color:'var(--muted-foreground)',
          borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
        }}>{dbg ? '收起 debug' : 'debug JSON'}</button>
      </div>

      {dbg && (
        <pre style={{ border:'1px dashed var(--border)', borderRadius:6, padding:8, fontSize:12, whiteSpace:'pre-wrap', color:'var(--muted-foreground)', marginBottom:10, maxHeight:180, overflow:'auto' }}>
          {dbgData ? JSON.stringify(dbgData, null, 2) : '（加载中…）'}
        </pre>
      )}

      {/* 时间线 */}
      <div style={{ fontSize:12, color:'var(--muted-foreground)', marginBottom:6 }}>时间线 · 自观测窗口</div>
      <div style={{ position:'relative', paddingLeft:14, borderLeft:`2px solid var(--border)` }}>
        {timeline.length === 0 && (
          <div style={{ fontSize:13, color:'var(--muted-foreground)', padding:'4px 0 8px' }}>
            （暂无路由事件——等待首条用户消息）
          </div>
        )}
        {timeline.map((ev: any) => {
          const color = BAND_COLORS[ev.band] || '#888'
          return (
            <div key={ev.seq} style={{ position:'relative', marginBottom:6, padding:'6px 8px', background:'var(--card)', border:`1px solid var(--border)`, borderRadius:6 }}>
              <span style={{ position:'absolute', left:-19, top:8, width:9, height:9, borderRadius:'50%', background:'var(--background)', border:`2px solid ${color}` }} />
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:'var(--muted-foreground)' }}>{new Date(ev.ts || Date.now()).toLocaleTimeString([], { hour12:false })}</span>
                <b style={{ fontSize:13 }}>{ev.type}</b>
                <SourceTag source={ev.source} />
                <span style={{ marginLeft:'auto', fontSize:12, color }}>{ev.band}</span>
              </div>
              {ev.detail && <div style={{ fontSize:12, color:'var(--muted-foreground)', marginTop:2, wordBreak:'break-all' }}>{ev.detail}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}