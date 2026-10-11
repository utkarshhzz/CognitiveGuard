import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Unlearn from './pages/Unlearn'
import Lineage from './pages/Lineage'
import DPIA from './pages/DPIA'
import Playbooks from './pages/Playbooks'
import ConsentManager from './pages/ConsentManager'
import './index.css'

const NAV = [
  { path: '/',            icon: '🛡️', label: 'Threat Overview',   badge: null,  section: 'MONITORING' },
  { path: '/agents',      icon: '🤖', label: 'Agent Registry',    badge: '1',   section: 'MONITORING' },
  { path: '/lineage',     icon: '🗺️', label: 'Data Lineage',      badge: null,  section: 'MONITORING' },
  { path: '/unlearn',     icon: '🧠', label: 'Machine Unlearning',badge: null,  section: 'PRIVACY' },
  { path: '/consent',     icon: '📋', label: 'Consent Manager',   badge: '3',   section: 'PRIVACY' },
  { path: '/dpia',        icon: '📊', label: 'DPIA Reports',      badge: null,  section: 'COMPLIANCE' },
  { path: '/playbooks',   icon: '⚡', label: 'Remediation',       badge: null,  section: 'COMPLIANCE' },
]

function Sidebar() {
  const loc = useLocation()
  const sections = [...new Set(NAV.map(n => n.section))]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <div>
          <div className="logo-text">CognitiveGuard</div>
          <div className="logo-sub">AI PRIVACY PLATFORM</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {sections.map(sec => (
          <div key={sec}>
            <div className="nav-section-label">{sec}</div>
            {NAV.filter(n => n.section === sec).map(n => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span style={{fontSize:16}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="compliance-badge">
          <span>✅</span>
          <div>
            <div style={{fontWeight:700, fontSize:11}}>DPDP Compliant</div>
            <div style={{fontSize:10, opacity:0.7}}>v1.0 · SDF Mode</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ title, subtitle }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <div className="live-indicator">
          <div className="live-dot" />
          LIVE
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>
          {time.toLocaleTimeString()}
        </div>
        <button className="btn btn-ghost btn-sm">⚙️ Settings</button>
      </div>
    </header>
  )
}

const PAGE_META = {
  '/':         { title: '🛡️ Threat Overview',    subtitle: 'Real-time CTEM · Zero-Trust · DPDP Compliance Dashboard' },
  '/agents':   { title: '🤖 Agent Registry',     subtitle: 'JIT Access Control · Privilege Escalation Detection' },
  '/lineage':  { title: '🗺️ Data Lineage Map',   subtitle: 'PII Flow Tracking · Source-to-Inference Tracing' },
  '/unlearn':  { title: '🧠 Machine Unlearning', subtitle: 'SISA Unlearning Engine · Cryptographic Erasure Proofs · DPDP §12' },
  '/consent':  { title: '📋 Consent Manager',    subtitle: 'Data Principal Rights · Purpose Limitation · Right to Erasure' },
  '/dpia':     { title: '📊 DPIA Reports',       subtitle: 'Dynamic Privacy Impact Assessment · DPBI Formatted Exports' },
  '/playbooks':{ title: '⚡ Remediation Hub',    subtitle: 'One-Click Fixes · Differential Privacy · eBPF Filters' },
}

export default function App() {
  const [loc, setLoc] = useState('/')
  const meta = PAGE_META[loc] || PAGE_META['/']
  return (
    <BrowserRouter>
      <RouteTracker onChange={setLoc} />
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          <div className="page-content">
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/agents"   element={<Agents />} />
              <Route path="/lineage"  element={<Lineage />} />
              <Route path="/unlearn"  element={<Unlearn />} />
              <Route path="/consent"  element={<ConsentManager />} />
              <Route path="/dpia"     element={<DPIA />} />
              <Route path="/playbooks"element={<Playbooks />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

function RouteTracker({ onChange }) {
  const loc = useLocation()
  useEffect(() => { onChange(loc.pathname) }, [loc.pathname])
  return null
}
