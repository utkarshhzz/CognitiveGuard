import { useEffect, useRef, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { useLiveEvents, useMetrics, useBurndown } from '../data/store'

// ── Metric Card ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, variant = 'info', icon, delta }) {
  return (
    <div className={`metric-card ${variant}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${variant}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
      {delta != null && (
        <div className={`card-delta ${delta >= 0 ? 'negative' : 'positive'}`}>
          {delta >= 0 ? `▲ +${delta}` : `▼ ${Math.abs(delta)}`} since last hour
        </div>
      )}
    </div>
  )
}

// ── Risk Score Gauge ───────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--accent-green)'
  const label = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
  const r = 60, circ = 2 * Math.PI * r, dash = (score / 100) * circ

  return (
    <div className="gauge-container">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="14"/>
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease' }}
        />
        <text x="80" y="72" textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="Inter">{score}</text>
        <text x="80" y="92" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontFamily="Inter">RISK SCORE</text>
        <text x="80" y="108" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="Inter">{label}</text>
      </svg>
    </div>
  )
}

// ── Live Alert Feed ────────────────────────────────────────────────────────────
function AlertFeed({ events }) {
  const feedRef = useRef()
  return (
    <div className="alert-feed" ref={feedRef}>
      {events.map(e => (
        <div key={e.id} className={`alert-item ${e.severity}`}>
          <span className={`alert-badge badge-${e.severity}`}>{e.severity}</span>
          <span className="alert-text">
            <strong style={{color:'var(--text-primary)', marginRight:4}}>{e.type}</strong>
            {e.msg}
          </span>
          <span className="alert-time">{new Date(e.timestamp).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Burndown Chart ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-glass)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{color:'var(--text-muted)', marginBottom:6}}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{color:p.color, display:'flex', gap:8}}>
          <span>{p.name.toUpperCase()}</span>
          <span style={{fontWeight:700}}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function BurndownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{top:4, right:4, bottom:0, left:-20}}>
        <defs>
          <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--critical)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--critical)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--high)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--high)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gMed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--medium)" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="var(--medium)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} />
        <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickLine={false} axisLine={false}/>
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="critical" stroke="var(--critical)" fill="url(#gCrit)" strokeWidth={2} dot={false}/>
        <Area type="monotone" dataKey="high"     stroke="var(--high)"     fill="url(#gHigh)" strokeWidth={2} dot={false}/>
        <Area type="monotone" dataKey="medium"   stroke="var(--medium)"   fill="url(#gMed)"  strokeWidth={2} dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Attack Vector Heatmap ─────────────────────────────────────────────────────
const ATTACK_VECTORS = [
  { label: 'Prompt Injection',     count: 7,  max: 15, color: 'var(--critical)' },
  { label: 'PII Exfiltration',     count: 12, max: 20, color: 'var(--high)' },
  { label: 'Shadow AI Endpoints',  count: 2,  max: 5,  color: 'var(--high)' },
  { label: 'Consent Violations',   count: 5,  max: 10, color: 'var(--medium)' },
  { label: 'Privilege Escalation', count: 3,  max: 10, color: 'var(--medium)' },
  { label: 'Model Inversion',      count: 1,  max: 5,  color: 'var(--critical)' },
  { label: 'Vector DB Leakage',    count: 4,  max: 8,  color: 'var(--high)' },
]

function AttackVectors({ events }) {
  // Update counts from live events
  const [counts, setCounts] = useState(ATTACK_VECTORS)
  useEffect(() => {
    if (!events.length) return
    const last = events[0]
    setCounts(prev => prev.map(v => {
      if (last.type === 'PROMPT_INJECTION' && v.label === 'Prompt Injection')
        return {...v, count: Math.min(v.count + 1, v.max)}
      if (last.type === 'PII_FLOW' && v.label === 'PII Exfiltration')
        return {...v, count: Math.min(v.count + 1, v.max)}
      if (last.type === 'SHADOW_AI' && v.label === 'Shadow AI Endpoints')
        return {...v, count: Math.min(v.count + 1, v.max)}
      return v
    }))
  }, [events[0]?.id])

  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {counts.map(v => (
        <div key={v.label}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12}}>
            <span style={{color:'var(--text-secondary)'}}>{v.label}</span>
            <span style={{color:v.color, fontWeight:700}}>{v.count}</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{width:`${(v.count/v.max)*100}%`, background:v.color}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Compliance Snapshot ────────────────────────────────────────────────────────
const DPDP_SECTIONS = [
  { section: '§7 — Consent',       score: 91, status: '✅' },
  { section: '§9 — Data Minimization', score: 78, status: '⚠️' },
  { section: '§12 — Right to Erasure', score: 100, status: '✅' },
  { section: '§16 — Data Localization', score: 85, status: '✅' },
  { section: '§27 — SDF Obligations',  score: 72, status: '⚠️' },
]

function CompliancePanel() {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      {DPDP_SECTIONS.map(d => (
        <div key={d.section} style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:14}}>{d.status}</span>
          <span style={{fontSize:12, color:'var(--text-secondary)', flex:1}}>{d.section}</span>
          <span style={{fontSize:12, fontWeight:700, color: d.score>=90?'var(--accent-green)':d.score>=75?'var(--medium)':'var(--high)'}}>{d.score}%</span>
          <div style={{width:80}}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{
                width:`${d.score}%`,
                background: d.score>=90?'var(--accent-green)':d.score>=75?'var(--medium)':'var(--high)'
              }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const events  = useLiveEvents(30)
  const metrics = useMetrics()
  const burndown = useBurndown()

  const riskColor = metrics.riskScore >= 80 ? 'critical' : metrics.riskScore >= 60 ? 'high' : 'medium'

  return (
    <div className="fade-in">
      {/* Critical Alert Banner */}
      {events[0]?.severity === 'CRITICAL' && (
        <div style={{
          background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.3)',
          borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:20,
          display:'flex', alignItems:'center', gap:12, fontSize:13
        }}>
          <span style={{fontSize:20}}>🚨</span>
          <div style={{flex:1}}>
            <strong style={{color:'var(--critical)'}}>CRITICAL ALERT — </strong>
            <span style={{color:'var(--text-secondary)'}}>{events[0].msg}</span>
          </div>
          <button className="btn btn-danger btn-sm">Investigate →</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="metrics-grid">
        <MetricCard label="Composite Risk Score"  value={metrics.riskScore}         sub="CTEM aggregate" variant={riskColor}    icon="⚠️" delta={3} />
        <MetricCard label="Threats Blocked"       value={metrics.threatsBlocked}    sub="last 24 hours"  variant="info"          icon="🛡️" />
        <MetricCard label="PII Flows Detected"    value={metrics.piiFlowsDetected}  sub="active flows"   variant="medium"        icon="🔍" />
        <MetricCard label="Injections Blocked"    value={metrics.injectionsBlocked} sub="prompt attacks" variant="critical"      icon="💉" />
        <MetricCard label="Shadow AI Endpoints"   value={metrics.shadowEndpoints}   sub="unregistered"   variant="high"          icon="👻" />
        <MetricCard label="Compliance Score"      value={`${metrics.complianceScore}%`} sub="DPDP Act"   variant="good"          icon="📋" />
        <MetricCard label="Erasure Proofs Issued" value={metrics.erasureProofs}     sub="Right to Erasure verified" variant="info" icon="🔐" />
        <MetricCard label="Active Agents"         value={metrics.activeAgents}      sub="under ZTA governance" variant="info"    icon="🤖" />
      </div>

      {/* Row 1: Burndown + Risk Gauge */}
      <div className="two-col" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📉 Vulnerability Burndown — Last 20 Minutes</span>
            <div style={{display:'flex', gap:12, fontSize:11}}>
              <span style={{color:'var(--critical)'}}>● Critical</span>
              <span style={{color:'var(--high)'}}>● High</span>
              <span style={{color:'var(--medium)'}}>● Medium</span>
            </div>
          </div>
          <BurndownChart data={burndown} />
        </div>
        <div className="card" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24}}>
          <RiskGauge score={metrics.riskScore} />
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:4}}>CTEM Engine</div>
            <div style={{fontSize:13, color:'var(--accent-green)', fontWeight:600}}>✓ All systems monitoring</div>
          </div>
        </div>
      </div>

      {/* Row 2: Live Feed + Attack Vectors + Compliance */}
      <div style={{display:'grid', gridTemplateColumns:'1.8fr 1fr 1fr', gap:20, marginBottom:20}}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📡 Live Threat Feed</span>
            <div className="live-indicator"><div className="live-dot"/>STREAMING</div>
          </div>
          <AlertFeed events={events} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎯 Attack Vectors</span>
          </div>
          <AttackVectors events={events} />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 DPDP Compliance</span>
          </div>
          <CompliancePanel />
        </div>
      </div>

      {/* Row 3: Quick Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
        {[
          { label:'Vector Store Shards', val:'8 / 8 Healthy', color:'var(--accent-green)', icon:'🧮' },
          { label:'JIT Tokens Active',   val:'3 Live',         color:'var(--accent-blue)',  icon:'🔑' },
          { label:'Consent Records',     val:'1,247 Tracked',  color:'var(--accent-purple)',icon:'📝' },
          { label:'Data Fiduciary Mode', val:'SDF — ACTIVE',   color:'var(--accent-amber)', icon:'🏛️' },
        ].map(s => (
          <div key={s.label} style={{
            background:'var(--bg-glass)', border:'1px solid var(--border-glass)',
            borderRadius:'var(--radius-md)', padding:'14px 16px',
            display:'flex', alignItems:'center', gap:12
          }}>
            <span style={{fontSize:22}}>{s.icon}</span>
            <div>
              <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:2}}>{s.label}</div>
              <div style={{fontSize:13, fontWeight:700, color:s.color}}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
