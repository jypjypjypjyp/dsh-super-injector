import { useState, useEffect } from 'react'

const API = '/super-injector/api/router'

export function RouterPanel({ visible, scope }: any): JSX.Element {
  const [sess, setSess] = useState<string | null>(scope?.sessionId ?? null)
  const [snap, setSnap] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [dbg, setDbg] = useState<boolean>(false)
  const [dbgData, setDbgData] = useState<any>(null)

  useEffect(() => {
    if (!visible) return  // visible-gated 暂停
    let alive = true
    const sid = sess || scope?.sessionId || ''
    const load = async () => {
      try {
        const [s, t] = await Promise.all([
          fetch(`${API}/status?sessionId=${sid}`).then(r=>r.json()),
          fetch(`${API}/timeline?sessionId=${sid}`).then(r=>r.json()),
        ])
        if (!alive) return
        if (s.ok) setSnap(s.status)
        if (t.ok) setTimeline(t.timeline || [])
      } catch {}
    }
    const loadDbg = async () => {
      if (!dbg) return
      try {
        const d = await fetch(`${API}/debug?sessionId=${sid}`).then(r=>r.json())
        if (alive && d.ok) setDbgData(d.debug)
      } catch {}
    }
    load()
    loadDbg()
    const id = setInterval(() => { load(); loadDbg() }, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [sess, visible, scope, dbg])

  return (
    <div style={{ padding: 8, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
        <strong>路由观测</strong>
        <span style={{ fontSize:10, color: snap?.confidence === 'low' ? '#f1c40f' : 'var(--muted-foreground)' }}>
          {visible ? '● 实时' : '（面板隐藏 · 已暂停）'}
        </span>
      </div>
      {snap && (
        <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:8, marginBottom:8 }}>
          <div>mode <b>{snap.mode}</b> · band <b>{snap.band}</b> · <span title={snap.source}>{snap.source}</span></div>
          <div style={{ color:'var(--muted-foreground)', fontSize:11 }}>{snap.persona}</div>
          <div>核心工具：{(snap.core||[]).map((c:any)=><span key={c} style={{border:'1px solid var(--border)',borderRadius:4,marginRight:4,padding:'0 4px'}}>{c}</span>)}</div>
          <div>override: <b>{snap.override ?? '无'}</b></div>
        </div>
      )}
      <button onClick={()=>setDbg(!dbg)} style={{ background:'transparent',border:'1px solid var(--border)',borderRadius:6,padding:'2px 8px',fontSize:11,cursor:'pointer' }}>debug JSON</button>
      {dbg && <pre style={{ border:'1px dashed var(--border)',padding:6,fontSize:10,whiteSpace:'pre-wrap' }}>{dbgData ? JSON.stringify(dbgData, null, 2) : '（加载中…）'}</pre>}
      <div style={{ marginTop:8, borderLeft:'2px solid var(--border)', paddingLeft:10 }}>
        {timeline.length === 0 && <div style={{ color:'var(--muted-foreground)', fontSize:11 }}>（暂无路由事件——等待首条用户消息）</div>}
        {timeline.map((ev: any) => (
          <div key={ev.seq} style={{ marginBottom:4, fontSize:11 }}>
            <span style={{ color:'var(--muted-foreground)' }}>[{ev.band}]</span>
            {' '}<b>{ev.type}</b>{ev.detail ? ` · ${ev.detail}` : ''}
            <span style={{ float:'right', color:'var(--muted-foreground)', fontSize:10 }}>{ev.source}</span>
          </div>
        ))}
      </div>
    </div>
  )
}