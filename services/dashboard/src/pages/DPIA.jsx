import { useState } from 'react'
import jsPDF from 'jspdf'

const COMPLIANCE_DATA = {
  org: 'Acme Corp — AI Division',
  period: 'Q4 FY 2026',
  assessor: 'CognitiveGuard AI Platform v1.0',
  generated: new Date().toLocaleDateString('en-IN', {year:'numeric',month:'long',day:'numeric'}),
  dpo: 'Dr. Ananya Krishnamurthy',
  sections: [
    { id:'§7',  title:'Consent Management',         score:91, status:'COMPLIANT',     findings:'Consent Manager active for 1,247 data principals. Purpose-limited tokens verified.', risk:'LOW' },
    { id:'§8',  title:'Notice Obligations',          score:88, status:'COMPLIANT',     findings:'Privacy notices served for all AI data processing activities.',                     risk:'LOW' },
    { id:'§9',  title:'Data Minimization',           score:78, status:'PARTIAL',       findings:'3 agent workflows collecting excess metadata. Remediation playbook deployed.',      risk:'MEDIUM' },
    { id:'§12', title:'Right to Erasure',            score:100,status:'COMPLIANT',     findings:'SISA unlearning executed for 12 data principals. Cryptographic proofs generated.', risk:'NONE' },
    { id:'§16', title:'Data Localization',           score:85, status:'COMPLIANT',     findings:'All processing on India-region servers. 1 shadow endpoint detected & blocked.',    risk:'LOW' },
    { id:'§17', title:'Children\'s Data',            score:95, status:'COMPLIANT',     findings:'Age verification active on all PII ingestion endpoints.',                         risk:'LOW' },
    { id:'§24', title:'Security Safeguards',         score:82, status:'COMPLIANT',     findings:'Zero-Trust gateway active. 142 threats blocked in 24h. eBPF filters deployed.',   risk:'LOW' },
    { id:'§27', title:'SDF Obligations',             score:72, status:'PARTIAL',       findings:'DPIA cadence not at required 90-day interval. 2 AI systems under review.',         risk:'MEDIUM' },
    { id:'§30', title:'Audit & Accountability',      score:96, status:'COMPLIANT',     findings:'Full PostgreSQL audit ledger with automated triggers. 100% API coverage.',         risk:'NONE' },
  ],
  erasureEvents: [
    { dpid:'dp-user-001', name:'Priya Sharma',  date:'2026-10-01', docs:5, proof:'Verified'},
    { dpid:'dp-user-007', name:'Ananya Iyer',   date:'2026-10-08', docs:8, proof:'Verified'},
    { dpid:'dp-user-042', name:'Vikram Nair',   date:'2026-10-10', docs:2, proof:'Verified'},
  ],
  agentRisks: [
    { id:'agt-analytics-02', name:'Analytics Inference', risk:'HIGH', action:'Enhanced monitoring, JIT-only access' },
    { id:'agt-shadow-04',    name:'Shadow API Client',   risk:'CRITICAL', action:'Permanently suspended, endpoint blocked' },
  ]
}

function ScoreBar({ score }) {
  const color = score >= 90 ? 'var(--accent-green)' : score >= 75 ? 'var(--medium)' : 'var(--high)'
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <div style={{flex:1}}>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{width:`${score}%`, background:color}}/>
        </div>
      </div>
      <span style={{fontSize:12, fontWeight:700, color, minWidth:35, textAlign:'right'}}>{score}%</span>
    </div>
  )
}

function StatusPill({ status }) {
  const styles = {
    COMPLIANT: 'status-active',
    PARTIAL:   'status-medium',
    NON_COMPLIANT: 'status-critical',
  }
  return <span className={`status-badge ${styles[status] || 'status-medium'}`}>{status}</span>
}

export default function DPIA() {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [org, setOrg] = useState(COMPLIANCE_DATA.org)
  const [period, setPeriod] = useState(COMPLIANCE_DATA.period)

  const overallScore = Math.round(COMPLIANCE_DATA.sections.reduce((a,s)=>a+s.score,0) / COMPLIANCE_DATA.sections.length)

  const generatePDF = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1500))

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, margin = 18

    // Header
    doc.setFillColor(6, 11, 24)
    doc.rect(0, 0, W, 45, 'F')
    doc.setTextColor(79, 156, 249)
    doc.setFontSize(20).setFont('helvetica','bold')
    doc.text('CognitiveGuard AI', margin, 18)
    doc.setFontSize(11).setTextColor(148, 163, 184)
    doc.text('Data Protection Impact Assessment (DPIA)', margin, 26)
    doc.setFontSize(9).setTextColor(100, 116, 139)
    doc.text(`DPDP Act 2023 — Significant Data Fiduciary Compliance Report`, margin, 34)
    doc.text(`Generated: ${COMPLIANCE_DATA.generated}`, margin, 40)

    // Overall Score
    doc.setFillColor(13, 21, 38)
    doc.roundedRect(margin, 52, W - margin*2, 28, 4, 4, 'F')
    doc.setFontSize(32).setFont('helvetica','bold').setTextColor(74, 222, 128)
    doc.text(`${overallScore}%`, margin + 8, 72)
    doc.setFontSize(11).setTextColor(148, 163, 184).setFont('helvetica','normal')
    doc.text('Overall DPDP Compliance Score', margin + 35, 64)
    doc.setFontSize(9).setTextColor(100, 116, 139)
    doc.text(`Organisation: ${org}  |  Period: ${period}  |  DPO: ${COMPLIANCE_DATA.dpo}`, margin + 35, 72)

    // Sections Table
    let y = 90
    doc.setFontSize(12).setFont('helvetica','bold').setTextColor(226, 232, 240)
    doc.text('DPDP Section-by-Section Assessment', margin, y); y += 8

    COMPLIANCE_DATA.sections.forEach((s, i) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFillColor(i%2===0 ? 18:13, i%2===0 ? 30:21, i%2===0 ? 53:38)
      doc.rect(margin, y-4, W-margin*2, 14, 'F')
      doc.setFontSize(8).setFont('helvetica','bold').setTextColor(226,232,240)
      doc.text(`${s.id} — ${s.title}`, margin+2, y+3)
      doc.setFont('helvetica','normal').setTextColor(148,163,184).setFontSize(7)
      doc.text(s.findings.substring(0,90), margin+2, y+8)
      doc.setFont('helvetica','bold')
        .setTextColor(s.score>=90?[74,222,128]:s.score>=75?[251,191,36]:[251,146,60])
        .setFontSize(9)
      doc.text(`${s.score}%`, W-margin-10, y+3)
      y += 16
    })

    // Erasure Events
    y += 6
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(12).setFont('helvetica','bold').setTextColor(226,232,240)
    doc.text('Machine Unlearning — Erasure Events (§12)', margin, y); y += 8
    COMPLIANCE_DATA.erasureEvents.forEach(e => {
      doc.setFontSize(8).setFont('helvetica','normal').setTextColor(148,163,184)
      doc.text(`• ${e.name} (${e.dpid}) — ${e.date} — ${e.docs} docs erased — ${e.proof}`, margin+2, y)
      y += 7
    })

    // Footer
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setFontSize(7).setTextColor(100,116,139).setFont('helvetica','normal')
      doc.text('CognitiveGuard AI Platform — Confidential — For Data Protection Board of India (DPBI)', margin, 290)
      doc.text(`Page ${p} of ${pages}`, W-margin-15, 290)
    }

    doc.save(`DPIA_${org.replace(/\s+/g,'_')}_${Date.now()}.pdf`)
    setGenerated(true)
    setGenerating(false)
  }

  return (
    <div className="fade-in">
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20}}>
        {/* Left: Section Assessment */}
        <div>
          {/* Config */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <span className="card-title">⚙️ Report Configuration</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div className="input-group">
                <label>Organisation</label>
                <input value={org} onChange={e=>setOrg(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Assessment Period</label>
                <input value={period} onChange={e=>setPeriod(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Data Protection Officer</label>
                <input defaultValue={COMPLIANCE_DATA.dpo} />
              </div>
              <div className="input-group">
                <label>Report Standard</label>
                <select defaultValue="dpdp">
                  <option value="dpdp">DPDP Act 2023 (India)</option>
                  <option value="gdpr">GDPR (EU)</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Scores */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 DPDP Section Assessment</span>
              <div style={{
                background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)',
                borderRadius:8, padding:'4px 12px', fontSize:13, color:'var(--accent-green)', fontWeight:700
              }}>
                {overallScore}% Overall
              </div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {COMPLIANCE_DATA.sections.map(s => (
                <div key={s.id}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                    <span style={{fontSize:12, fontWeight:700, color:'var(--accent-cyan)', minWidth:32}}>{s.id}</span>
                    <span style={{fontSize:12, color:'var(--text-primary)', flex:1}}>{s.title}</span>
                    <StatusPill status={s.status} />
                    <span style={{fontSize:10, padding:'2px 6px', borderRadius:4,
                      background: s.risk==='NONE'?'rgba(74,222,128,0.1)':s.risk==='LOW'?'rgba(34,211,238,0.1)':s.risk==='MEDIUM'?'rgba(251,191,36,0.1)':'rgba(244,63,94,0.1)',
                      color: s.risk==='NONE'?'var(--accent-green)':s.risk==='LOW'?'var(--info)':s.risk==='MEDIUM'?'var(--medium)':'var(--critical)'
                    }}>{s.risk} RISK</span>
                  </div>
                  <ScoreBar score={s.score} />
                  <div style={{fontSize:11, color:'var(--text-muted)', marginTop:3}}>{s.findings}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary & Export */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* Score Summary */}
          <div className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:72, fontWeight:900, color:'var(--accent-green)', lineHeight:1}}>{overallScore}%</div>
            <div style={{fontSize:14, color:'var(--text-secondary)', marginTop:4}}>DPDP Compliance Score</div>
            <div style={{fontSize:12, color:'var(--text-muted)', marginTop:2}}>{COMPLIANCE_DATA.generated}</div>
            <div style={{margin:'16px 0', display:'flex', justifyContent:'center', gap:16, fontSize:12}}>
              {[
                {c:COMPLIANCE_DATA.sections.filter(s=>s.status==='COMPLIANT').length, label:'Compliant', color:'var(--accent-green)'},
                {c:COMPLIANCE_DATA.sections.filter(s=>s.status==='PARTIAL').length, label:'Partial', color:'var(--medium)'},
                {c:COMPLIANCE_DATA.sections.filter(s=>s.status==='NON_COMPLIANT').length, label:'Failing', color:'var(--critical)'},
              ].map(x => (
                <div key={x.label} style={{textAlign:'center'}}>
                  <div style={{fontSize:24, fontWeight:800, color:x.color}}>{x.c}</div>
                  <div style={{color:'var(--text-muted)'}}>{x.label}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" style={{width:'100%'}}
              onClick={generatePDF} disabled={generating}>
              {generating ? '⚙️ Generating PDF...' : '📄 Export DPBI-Format PDF'}
            </button>
            {generated && (
              <div style={{color:'var(--accent-green)', fontSize:12, marginTop:8}}>✅ PDF saved successfully</div>
            )}
          </div>

          {/* Erasure Events */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔐 Erasure Events (§12)</span>
              <span style={{fontSize:12, color:'var(--accent-green)', fontWeight:700}}>{COMPLIANCE_DATA.erasureEvents.length} proofs</span>
            </div>
            {COMPLIANCE_DATA.erasureEvents.map(e => (
              <div key={e.dpid} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-glass)', fontSize:12}}>
                <span style={{fontSize:18}}>✅</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, color:'var(--text-primary)'}}>{e.name}</div>
                  <div style={{color:'var(--text-muted)', fontSize:11}}>{e.dpid} · {e.date} · {e.docs} docs</div>
                </div>
                <span className="status-badge status-active">{e.proof}</span>
              </div>
            ))}
          </div>

          {/* Agent Risk Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🤖 High-Risk Agents</span>
            </div>
            {COMPLIANCE_DATA.agentRisks.map(a => (
              <div key={a.id} style={{padding:'10px 0', borderBottom:'1px solid var(--border-glass)'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                  <span style={{fontSize:13, fontWeight:600}}>{a.name}</span>
                  <span className={`status-badge status-${a.risk.toLowerCase()}`}>{a.risk}</span>
                </div>
                <div style={{fontSize:11, color:'var(--text-muted)'}}>{a.action}</div>
              </div>
            ))}
          </div>

          {/* Regulatory Info */}
          <div style={{
            background:'rgba(79,156,249,0.05)', border:'1px solid rgba(79,156,249,0.15)',
            borderRadius:'var(--radius-md)', padding:'14px 16px', fontSize:12
          }}>
            <strong style={{color:'var(--accent-blue)'}}>🏛️ DPBI Submission Ready</strong>
            <div style={{color:'var(--text-muted)', marginTop:4}}>
              This report follows the Data Protection Board of India's prescribed format for
              Significant Data Fiduciary audits under the DPDP Act 2023.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
