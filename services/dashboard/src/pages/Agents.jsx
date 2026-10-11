import { useState } from 'react'
import { AGENTS } from '../data/store'

const AGENT_DATA = AGENTS.map((a, i) => ({
  ...a,
  scopes:       i === 0 ? ['crm:read','datastore:write'] : i === 1 ? ['analytics:read','model:inference'] : i === 2 ? ['hr:read','hr:write'] : i === 3 ? [] : ['audit:read','report:generate'],
  lastAccess:   new Date(Date.now() - Math.random()*3600000).toISOString(),
  requestCount: Math.floor(Math.random()*500 + 50),
  deniedCount:  Math.floor(Math.random()*20),
  jitActive:    i < 3 && i !== 1,
  dpids:        i === 0 ? 142 : i === 1 ? 891 : i === 2 ? 67 : 0,
}))

function RiskBadge({ level }) {
  return <span className={`status-badge status-${level.toLowerCase()}`}>⬤ {level}</span>
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
}

function AgentDetail({ agent, onClose }) {
  const [jitActive, setJitActive] = useState(agent.jitActive)
  const [suspended, setSuspended] = useState(agent.status === 'SUSPENDED')

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'
    }} onClick={onClose}>
      <div style={{
        background:'var(--bg-surface)', border:'1px solid var(--border-glass)',
        borderRadius:'var(--radius-xl)', padding:28, width:'min(600px,90vw)',
        maxHeight:'80vh', overflowY:'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:24}}>
          <div style={{
            width:48, height:48, borderRadius:12,
            background: agent.status==='SUSPENDED' ? 'rgba(244,63,94,0.15)' : 'rgba(79,156,249,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24
          }}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontSize:17, fontWeight:700}}>{agent.name}</div>
            <div style={{fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>{agent.id}</div>
          </div>
          <RiskBadge level={agent.risk} />
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20}}>
          {[
            {label:'Team', val: agent.team},
            {label:'Status', val: <StatusBadge status={suspended?'SUSPENDED':agent.status}/>},
            {label:'Total Requests', val: agent.requestCount},
            {label:'Denied Requests', val: <span style={{color:'var(--accent-red)'}}>{agent.deniedCount}</span>},
            {label:'Data Principals Accessed', val: agent.dpids},
            {label:'Last Active', val: new Date(agent.lastAccess).toLocaleTimeString()},
          ].map(r => (
            <div key={r.label} style={{background:'var(--bg-elevated)', borderRadius:8, padding:'10px 14px'}}>
              <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:4}}>{r.label}</div>
              <div style={{fontSize:13, fontWeight:600}}>{r.val}</div>
            </div>
          ))}
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:8}}>ALLOWED SCOPES</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {agent.scopes.length ? agent.scopes.map(s => (
              <span key={s} style={{
                background:'rgba(79,156,249,0.1)', border:'1px solid rgba(79,156,249,0.2)',
                borderRadius:6, padding:'3px 10px', fontSize:11.5, color:'var(--accent-blue)', fontFamily:'var(--font-mono)'
              }}>{s}</span>
            )) : <span style={{color:'var(--text-muted)', fontSize:12}}>No scopes (suspended)</span>}
          </div>
        </div>

        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          <button className="btn btn-primary btn-sm" onClick={() => setJitActive(true)} disabled={jitActive || suspended}>
            🔑 Issue JIT Token (5 min)
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setSuspended(s => !s)}>
            {suspended ? '▶️ Reinstate Agent' : '⏸️ Suspend Agent'}
          </button>
          <button className="btn btn-ghost btn-sm">📋 View Audit Log</button>
        </div>
        {jitActive && (
          <div style={{
            marginTop:12, background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)',
            borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--accent-green)'
          }}>
            ✅ JIT Token issued · Expires in 5:00 · Scoped to current resource only
          </div>
        )}
      </div>
    </div>
  )
}

export default function Agents() {
  const [agents, setAgents] = useState(AGENT_DATA)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search)
    const matchFilter = filter === 'ALL' || a.risk === filter || a.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="fade-in">
      {selected && <AgentDetail agent={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <input placeholder="🔍 Search agents by name or ID..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1, maxWidth:340}} />
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:'auto'}}>
          <option value="ALL">All Agents</option>
          <option value="CRITICAL">Critical Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ACTIVE">Active</option>
        </select>
        <button className="btn btn-primary btn-sm">➕ Register Agent</button>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20}}>
        {[
          {label:'Total Agents', val: agents.length, color:'var(--accent-blue)', icon:'🤖'},
          {label:'High/Critical Risk', val: agents.filter(a=>['HIGH','CRITICAL'].includes(a.risk)).length, color:'var(--critical)', icon:'⚠️'},
          {label:'Suspended', val: agents.filter(a=>a.status==='SUSPENDED').length, color:'var(--accent-orange)', icon:'⏸️'},
          {label:'JIT Tokens Active', val: agents.filter(a=>a.jitActive).length, color:'var(--accent-green)', icon:'🔑'},
        ].map(s => (
          <div key={s.label} className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:24, marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:28, fontWeight:800, color:s.color}}>{s.val}</div>
            <div style={{fontSize:11, color:'var(--text-muted)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🤖 Registered AI Agents — Zero-Trust Governance</span>
          <span style={{fontSize:12, color:'var(--text-muted)'}}>{filtered.length} agents</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent ID</th>
                <th>Name</th>
                <th>Owner Team</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Requests (24h)</th>
                <th>Data Principals</th>
                <th>JIT Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{cursor:'pointer'}} onClick={() => setSelected(a)}>
                  <td style={{fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--text-muted)'}}>{a.id}</td>
                  <td style={{color:'var(--text-primary)', fontWeight:600}}>{a.name}</td>
                  <td>{a.team}</td>
                  <td><RiskBadge level={a.risk}/></td>
                  <td><StatusBadge status={a.status}/></td>
                  <td>
                    <span style={{color: a.deniedCount > 10 ? 'var(--accent-red)' : 'var(--text-secondary)'}}>
                      {a.requestCount} <span style={{color:'var(--accent-red)', fontSize:11}}>(-{a.deniedCount})</span>
                    </span>
                  </td>
                  <td>{a.dpids}</td>
                  <td>
                    {a.jitActive
                      ? <span className="status-badge status-active">🔑 Active</span>
                      : <span className="status-badge status-revoked">⬜ None</span>}
                  </td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex', gap:4}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(a)}>Details</button>
                      <button className="btn btn-danger btn-sm"
                        onClick={()=>setAgents(prev=>prev.map(ag=>ag.id===a.id?{...ag,status:'SUSPENDED'}:ag))}>
                        ⏸
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MCP Policy Info */}
      <div style={{
        marginTop:16, background:'rgba(79,156,249,0.05)', border:'1px solid rgba(79,156,249,0.15)',
        borderRadius:'var(--radius-md)', padding:'16px 20px', fontSize:13
      }}>
        <strong style={{color:'var(--accent-blue)'}}>🔒 Model Context Protocol (MCP) — JIT Policy Engine Active</strong>
        <div style={{color:'var(--text-muted)', marginTop:4}}>
          All agent API calls are intercepted and evaluated against OPA policies. JIT tokens are issued for exactly the requested resource with a 5-minute TTL.
          Consent tokens are validated before any data principal's data is accessed.
        </div>
      </div>
    </div>
  )
}
