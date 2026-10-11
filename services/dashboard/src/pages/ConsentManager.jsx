import { useState } from 'react'

const PURPOSES = ['ANALYTICS', 'MARKETING', 'HR_PROCESSING', 'CRM_SYNC', 'REPORTING', 'TRAINING']

const INITIAL_CONSENTS = [
  { dpid:'dp-user-001', name:'Priya Sharma',  purposes:{ ANALYTICS:true,  MARKETING:false, HR_PROCESSING:false, CRM_SYNC:true,  REPORTING:false, TRAINING:false }, since:'2026-09-01', revocations:0 },
  { dpid:'dp-user-002', name:'Rahul Mehta',   purposes:{ ANALYTICS:true,  MARKETING:true,  HR_PROCESSING:false, CRM_SYNC:false, REPORTING:false, TRAINING:false }, since:'2026-08-15', revocations:1 },
  { dpid:'dp-user-003', name:'Deepa Nair',    purposes:{ ANALYTICS:false, MARKETING:false, HR_PROCESSING:false, CRM_SYNC:false, REPORTING:false, TRAINING:false }, since:'2026-07-20', revocations:2 },
  { dpid:'dp-user-007', name:'Ananya Iyer',   purposes:{ ANALYTICS:true,  MARKETING:false, HR_PROCESSING:true,  CRM_SYNC:true,  REPORTING:false, TRAINING:false }, since:'2026-10-05', revocations:0 },
  { dpid:'dp-user-042', name:'Vikram Nair',   purposes:{ ANALYTICS:true,  MARKETING:true,  HR_PROCESSING:false, CRM_SYNC:true,  REPORTING:true,  TRAINING:false }, since:'2026-06-01', revocations:0 },
  { dpid:'dp-user-099', name:'Kavitha Reddy', purposes:{ ANALYTICS:true,  MARKETING:true,  HR_PROCESSING:true,  CRM_SYNC:true,  REPORTING:true,  TRAINING:true  }, since:'2026-05-10', revocations:0 },
]

const PURPOSE_ICONS = {
  ANALYTICS: '📊', MARKETING: '📣', HR_PROCESSING: '👥',
  CRM_SYNC: '🏢', REPORTING: '📋', TRAINING: '🧠'
}

export default function ConsentManager() {
  const [consents, setConsents] = useState(INITIAL_CONSENTS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [log, setLog] = useState([])

  const toggle = (dpid, purpose) => {
    const user = consents.find(c => c.dpid === dpid)
    const wasGranted = user.purposes[purpose]
    setConsents(prev => prev.map(c => c.dpid === dpid
      ? {...c, purposes:{...c.purposes, [purpose]: !wasGranted}, revocations: wasGranted ? c.revocations+1 : c.revocations}
      : c
    ))
    setLog(prev => [{
      dpid, name: user.name, purpose, action: wasGranted ? 'REVOKED' : 'GRANTED',
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 20))
    if (wasGranted) {
      setTimeout(() => alert(`🧠 SISA Unlearning triggered for ${purpose} data of ${user.name}.\nErasure proof will be generated automatically.`), 100)
    }
  }

  const revokeAll = (dpid) => {
    const user = consents.find(c => c.dpid === dpid)
    const grantedPurposes = Object.entries(user.purposes).filter(([,v])=>v).map(([k])=>k)
    setConsents(prev => prev.map(c => c.dpid === dpid
      ? {...c, purposes: Object.fromEntries(PURPOSES.map(p=>[p,false])), revocations: c.revocations + grantedPurposes.length}
      : c
    ))
    grantedPurposes.forEach(p => setLog(prev => [{dpid, name:user.name, purpose:p, action:'REVOKED', timestamp:new Date().toISOString()}, ...prev]))
  }

  const filtered = consents.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dpid.includes(search)
  )

  const stats = {
    total: consents.length,
    allGranted: consents.filter(c => Object.values(c.purposes).every(Boolean)).length,
    allRevoked: consents.filter(c => Object.values(c.purposes).every(v=>!v)).length,
    partial: consents.filter(c => {
      const vals = Object.values(c.purposes)
      return vals.some(Boolean) && !vals.every(Boolean)
    }).length,
  }

  return (
    <div className="fade-in">
      {/* Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20}}>
        {[
          {label:'Total Data Principals', val:stats.total, color:'var(--accent-blue)', icon:'👤'},
          {label:'Full Consent', val:stats.allGranted, color:'var(--accent-green)', icon:'✅'},
          {label:'Partial Consent', val:stats.partial, color:'var(--accent-amber)', icon:'⚠️'},
          {label:'All Revoked', val:stats.allRevoked, color:'var(--critical)', icon:'🚫'},
        ].map(s => (
          <div key={s.label} className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:22, marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:28, fontWeight:800, color:s.color}}>{s.val}</div>
            <div style={{fontSize:11, color:'var(--text-muted)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:20}}>
        {/* Consent Matrix */}
        <div>
          <div style={{display:'flex', gap:12, marginBottom:12}}>
            <input placeholder="🔍 Search data principals..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1}} />
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 Consent Registry — Purpose Matrix</span>
              <span style={{fontSize:11, color:'var(--text-muted)'}}>DPDP §7 — Purpose Limitation</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data Principal</th>
                    {PURPOSES.map(p => <th key={p} style={{textAlign:'center'}}>{PURPOSE_ICONS[p]}<br/><span style={{fontSize:9}}>{p.replace('_',' ')}</span></th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const grantCount = Object.values(c.purposes).filter(Boolean).length
                    return (
                      <tr key={c.dpid}>
                        <td>
                          <div style={{fontWeight:600}}>{c.name}</div>
                          <div style={{fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>{c.dpid}</div>
                          <div style={{fontSize:10, color:'var(--text-muted)'}}>Since {c.since} · {c.revocations} revocations</div>
                        </td>
                        {PURPOSES.map(p => (
                          <td key={p} style={{textAlign:'center'}}>
                            <button
                              onClick={() => toggle(c.dpid, p)}
                              style={{
                                width:28, height:28, borderRadius:6, border:'1px solid',
                                cursor:'pointer', fontSize:13, transition:'all 0.2s',
                                background: c.purposes[p] ? 'rgba(74,222,128,0.15)' : 'rgba(244,63,94,0.08)',
                                borderColor: c.purposes[p] ? 'rgba(74,222,128,0.3)' : 'rgba(244,63,94,0.2)',
                              }}
                              title={`${c.purposes[p] ? 'Revoke' : 'Grant'} ${p}`}
                            >
                              {c.purposes[p] ? '✅' : '⬜'}
                            </button>
                          </td>
                        ))}
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => revokeAll(c.dpid)}
                            disabled={grantCount === 0}>
                            Revoke All
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Consent Log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📜 Consent Activity Log</span>
            <div className="live-indicator"><div className="live-dot"/>LIVE</div>
          </div>
          {log.length === 0 ? (
            <div style={{textAlign:'center', color:'var(--text-muted)', padding:'40px 0', fontSize:13}}>
              Toggle consent checkboxes to see activity
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:6, maxHeight:500, overflowY:'auto'}}>
              {log.map((l, i) => (
                <div key={i} style={{
                  padding:'8px 10px', borderRadius:6, fontSize:12,
                  background: l.action==='GRANTED' ? 'rgba(74,222,128,0.05)' : 'rgba(244,63,94,0.05)',
                  border: `1px solid ${l.action==='GRANTED' ? 'rgba(74,222,128,0.15)' : 'rgba(244,63,94,0.15)'}`,
                  animation:'slideIn 0.3s ease'
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span>{l.action==='GRANTED' ? '✅' : '🚫'}</span>
                    <strong style={{color: l.action==='GRANTED' ? 'var(--accent-green)' : 'var(--critical)'}}>{l.action}</strong>
                    <span style={{color:'var(--text-muted)', fontSize:10, marginLeft:'auto'}}>{new Date(l.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{color:'var(--text-secondary)', marginTop:2}}>
                    {l.name} · <span style={{fontFamily:'var(--font-mono)', fontSize:10}}>{l.purpose}</span>
                  </div>
                  {l.action === 'REVOKED' && (
                    <div style={{color:'var(--accent-amber)', fontSize:11, marginTop:2}}>
                      ⚡ SISA Unlearning triggered automatically
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop:16, background:'rgba(79,156,249,0.05)', border:'1px solid rgba(79,156,249,0.15)',
            borderRadius:8, padding:'10px 12px', fontSize:12
          }}>
            <strong style={{color:'var(--accent-blue)'}}>🔗 Consent-Erasure Automation</strong>
            <div style={{color:'var(--text-muted)', marginTop:4}}>
              Any consent revocation automatically triggers SISA Machine Unlearning
              for that purpose's data in the vector store, generating a cryptographic
              Proof of Erasure per DPDP §12.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
