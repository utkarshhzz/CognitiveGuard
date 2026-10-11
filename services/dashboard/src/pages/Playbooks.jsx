import { useState } from 'react'

const PLAYBOOKS = [
  {
    id: 'dp001',
    icon: '🧠',
    title: 'Emergency SISA Unlearning',
    category: 'PRIVACY',
    severity: 'CRITICAL',
    description: 'Immediately execute SISA machine unlearning for a specified Data Principal to comply with Right to Erasure requests under DPDP §12.',
    steps: ['Identify target shard via DPID hash', 'Snapshot shard state (pre-erasure)', 'Delete all matching vector embeddings', 'Re-aggregate shard index', 'Generate cryptographic Audit Proof'],
    impact: 'Removes all embedded personal data influence without model retrain. ~12s execution.',
    trigger: 'Consent revocation, DPBI order, Legal notice',
    color: 'var(--critical)',
    deployed: false,
  },
  {
    id: 'dp002',
    icon: '🔒',
    title: 'Tighten Differential Privacy',
    category: 'SECURITY',
    severity: 'HIGH',
    description: 'Reduce the differential privacy epsilon (ε) parameter on the analytics pipeline from ε=2.0 to ε=0.8, reducing information leakage per query.',
    steps: ['Update ε parameter in DP config', 'Restart analytics inference agent', 'Verify noise calibration', 'Re-run sensitivity analysis', 'Log parameter change to audit ledger'],
    impact: 'Reduces per-query information leakage by ~60%. Slight accuracy trade-off.',
    trigger: 'High-frequency model inversion attempts detected',
    color: 'var(--high)',
    deployed: false,
  },
  {
    id: 'dp003',
    icon: '🚫',
    title: 'Block Shadow AI Endpoint',
    category: 'NETWORK',
    severity: 'CRITICAL',
    description: 'Deploy an eBPF network filter to block all outbound traffic to the detected shadow AI endpoint (api.unknown-llm.com), preventing unauthorized data exfiltration.',
    steps: ['Load eBPF program to kernel', 'Attach to relevant network interface', 'Block egress to target CIDR/domain', 'Redirect traffic to honeypot (optional)', 'Alert security team via webhook'],
    impact: 'Immediate hard block on shadow AI exfiltration. Zero downtime.',
    trigger: 'Shadow AI endpoint detected in CTEM telemetry',
    color: 'var(--critical)',
    deployed: false,
  },
  {
    id: 'dp004',
    icon: '⏸️',
    title: 'Suspend Rogue Agent',
    category: 'ACCESS CONTROL',
    severity: 'HIGH',
    description: 'Immediately revoke all JIT tokens and suspend the specified AI agent from making any API calls. Agent quarantined pending security review.',
    steps: ['Revoke all active JIT tokens', 'Update agent status to SUSPENDED', 'Blacklist agent certificate', 'Notify agent owner team', 'Trigger post-incident audit'],
    impact: 'Instant access revocation. Agent owner team alerted within 30s.',
    trigger: 'Privilege escalation, repeated consent violations, injection attempts',
    color: 'var(--high)',
    deployed: false,
  },
  {
    id: 'dp005',
    icon: '🔑',
    title: 'Enforce JIT-Only Access',
    category: 'ACCESS CONTROL',
    severity: 'MEDIUM',
    description: 'Downgrade all persistent API keys for a specified agent to Just-in-Time (JIT) tokens with 5-minute TTLs, enforcing least-privilege access per MCP.',
    steps: ['Revoke existing persistent tokens', 'Update agent policy to JIT-only mode', 'Set TTL to 300 seconds', 'Enable scope restrictions per resource', 'Update OPA policy ruleset'],
    impact: 'Eliminates standing privilege. Slight latency increase (~50ms per JIT issuance).',
    trigger: 'Agent classified as HIGH risk in audit analysis',
    color: 'var(--medium)',
    deployed: false,
  },
  {
    id: 'dp006',
    icon: '🛡️',
    title: 'Enable Prompt Injection Shield',
    category: 'SECURITY',
    severity: 'HIGH',
    description: 'Activate enhanced prompt injection detection on all inbound agent requests — deploys cosine-similarity filtering against known injection embeddings.',
    steps: ['Load injection embedding library (1,240 patterns)', 'Set similarity threshold to 0.85', 'Enable regex pre-filter layer', 'Configure auto-block on match', 'Enable honeypot logging for attacker analysis'],
    impact: 'Blocks 97.3% of known injection patterns. 8ms latency overhead per request.',
    trigger: 'Prompt injection events exceeding 3 per hour',
    color: 'var(--high)',
    deployed: false,
  },
  {
    id: 'dp007',
    icon: '📋',
    title: 'Trigger Emergency DPIA',
    category: 'COMPLIANCE',
    severity: 'MEDIUM',
    description: 'Initiate an unscheduled Data Protection Impact Assessment for the flagged AI system, generating a preliminary risk report within minutes using live telemetry data.',
    steps: ['Snapshot current agent access patterns', 'Run data flow lineage analysis', 'Calculate DPDP section scores', 'Generate preliminary risk narrative', 'Schedule DPO review within 24h'],
    impact: 'Preliminary DPIA report ready in ~3 minutes. Full report in 24h.',
    trigger: 'New AI system deployed, material data flow change detected',
    color: 'var(--medium)',
    deployed: false,
  },
  {
    id: 'dp008',
    icon: '🔄',
    title: 'Rotate Vector Store Keys',
    category: 'SECURITY',
    severity: 'HIGH',
    description: 'Rotate all ChromaDB authentication tokens and re-issue new credentials to authorized services only. Prevents unauthorized vector store access.',
    steps: ['Generate new HMAC key pair', 'Update ChromaDB auth config', 'Push new credentials to authorized services', 'Revoke old credentials', 'Verify connectivity for all authorized agents'],
    impact: 'Eliminates any compromised credential risk. 2-minute downtime window.',
    trigger: 'Suspected credential leak, periodic rotation policy',
    color: 'var(--high)',
    deployed: false,
  },
]

function PlaybookCard({ pb, onDeploy }) {
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(pb.deployed)
  const [expanded, setExpanded] = useState(false)

  const handleDeploy = async () => {
    setDeploying(true)
    await new Promise(r => setTimeout(r, 1800 + Math.random()*1000))
    setDeployed(true)
    setDeploying(false)
    onDeploy(pb.id)
  }

  return (
    <div className="playbook-card" style={{
      borderColor: deployed ? 'rgba(74,222,128,0.3)' : 'var(--border-glass)',
      background: deployed ? 'rgba(74,222,128,0.03)' : 'var(--bg-glass)',
    }}>
      <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:10}}>
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background: `${pb.color}18`,
          border: `1px solid ${pb.color}40`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20
        }}>{pb.icon}</div>
        <div style={{flex:1}}>
          <div className="playbook-title">{pb.title}</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:4}}>
            <span style={{fontSize:10, padding:'1px 7px', borderRadius:10, background:'var(--bg-elevated)', color:'var(--text-muted)'}}>{pb.category}</span>
            <span className={`status-badge status-${pb.severity.toLowerCase()}`} style={{fontSize:10, padding:'1px 7px'}}>{pb.severity}</span>
          </div>
        </div>
      </div>

      <p className="playbook-desc">{pb.description}</p>

      {expanded && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:600}}>EXECUTION STEPS</div>
          {pb.steps.map((s,i) => (
            <div key={i} style={{display:'flex', gap:8, marginBottom:5, fontSize:12}}>
              <span style={{
                width:18, height:18, borderRadius:'50%', background:`${pb.color}20`,
                color:pb.color, fontSize:10, fontWeight:700, display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0
              }}>{i+1}</span>
              <span style={{color:'var(--text-secondary)'}}>{s}</span>
            </div>
          ))}
          <div style={{marginTop:10, padding:'8px 12px', background:'var(--bg-elevated)', borderRadius:8, fontSize:11}}>
            <div><strong style={{color:'var(--text-primary)'}}>Impact:</strong> <span style={{color:'var(--text-muted)'}}>{pb.impact}</span></div>
            <div style={{marginTop:4}}><strong style={{color:'var(--text-primary)'}}>Trigger:</strong> <span style={{color:'var(--text-muted)'}}>{pb.trigger}</span></div>
          </div>
        </div>
      )}

      <div className="playbook-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(v=>!v)}>
          {expanded ? '▲ Less' : '▼ Details'}
        </button>
        <button
          className={`btn btn-sm ${deployed ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleDeploy}
          disabled={deploying || deployed}
          style={deployed ? {color:'var(--accent-green)', borderColor:'rgba(74,222,128,0.3)'} : {}}
        >
          {deploying ? '⚙️ Deploying...' : deployed ? '✅ Deployed' : '⚡ Deploy Fix'}
        </button>
      </div>
    </div>
  )
}

export default function Playbooks() {
  const [deployedIds, setDeployedIds] = useState(new Set())
  const [filter, setFilter] = useState('ALL')

  const categories = ['ALL', ...new Set(PLAYBOOKS.map(p => p.category))]
  const filtered = PLAYBOOKS.filter(p => filter === 'ALL' || p.category === filter)

  const handleDeploy = (id) => setDeployedIds(prev => new Set([...prev, id]))

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}}>
        <div style={{
          background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)',
          borderRadius:'var(--radius-md)', padding:'12px 16px', fontSize:13, flex:1
        }}>
          <strong style={{color:'var(--accent-amber)'}}>⚡ {PLAYBOOKS.length} Remediation Playbooks Available</strong>
          <span style={{color:'var(--text-muted)', marginLeft:8}}>·</span>
          <span style={{color:'var(--accent-green)', marginLeft:8}}>✅ {deployedIds.size} Deployed</span>
          <span style={{color:'var(--text-muted)', marginLeft:8}}>·</span>
          <span style={{color:'var(--accent-red)', marginLeft:8}}>🚨 {PLAYBOOKS.filter(p=>p.severity==='CRITICAL').length} Critical Available</span>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {categories.map(c => (
            <button key={c} className={`btn btn-sm ${filter===c?'btn-primary':'btn-ghost'}`}
              onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="playbook-grid">
        {filtered.map(pb => (
          <PlaybookCard key={pb.id} pb={pb} onDeploy={handleDeploy} />
        ))}
      </div>

      {/* Deployment Log */}
      {deployedIds.size > 0 && (
        <div className="card" style={{marginTop:20}}>
          <div className="card-header">
            <span className="card-title">📜 Deployment Log</span>
          </div>
          {PLAYBOOKS.filter(p => deployedIds.has(p.id)).map(p => (
            <div key={p.id} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--border-glass)', fontSize:12}}>
              <span>{p.icon}</span>
              <span style={{flex:1, color:'var(--text-secondary)'}}><strong>{p.title}</strong></span>
              <span style={{color:'var(--accent-green)', fontWeight:600}}>✅ Deployed</span>
              <span style={{color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>{new Date().toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
