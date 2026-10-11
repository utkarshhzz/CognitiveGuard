// Central mock data store — simulates backend WebSocket + REST for demo
import { useState, useEffect, useCallback, useRef } from 'react'

const GATEWAY  = import.meta.env.VITE_GATEWAY_URL   || 'http://localhost:8080'
const UNLEARN  = import.meta.env.VITE_UNLEARNING_URL || 'http://localhost:8001'
const CTEM_URL = import.meta.env.VITE_CTEM_URL       || 'http://localhost:8002'

// ── Synthetic event generator (mirrors ctem-pipeline/main.py logic) ──────────
const AGENTS = [
  { id: 'agt-crm-sync-01',  name: 'CRM Sync Agent',        team: 'Sales Eng',   risk: 'MEDIUM', status: 'ACTIVE' },
  { id: 'agt-analytics-02', name: 'Analytics Inference',   team: 'Data Science', risk: 'HIGH',   status: 'ACTIVE' },
  { id: 'agt-hr-proc-03',   name: 'HR Processing Agent',   team: 'HR Tech',      risk: 'LOW',    status: 'ACTIVE' },
  { id: 'agt-shadow-04',    name: '⚠️ Shadow API Client',  team: 'UNKNOWN',      risk: 'CRITICAL', status: 'SUSPENDED' },
  { id: 'agt-report-05',    name: 'Regulatory Reporter',   team: 'Legal',        risk: 'LOW',    status: 'ACTIVE' },
]

const EVENT_TEMPLATES = [
  { type:'PROMPT_INJECTION', severity:'CRITICAL', msg:'Prompt injection payload intercepted from agt-analytics-02 targeting LLM endpoint', agent:'agt-analytics-02' },
  { type:'SHADOW_AI',        severity:'HIGH',     msg:'Unregistered agent agt-shadow-04 calling api.openai.com — shadow AI detected', agent:'agt-shadow-04' },
  { type:'PII_FLOW',         severity:'MEDIUM',   msg:'PII types [AADHAAR, EMAIL] detected in CRM sync data flow to vector store', agent:'agt-crm-sync-01' },
  { type:'PRIVILEGE_ESCALATION', severity:'CRITICAL', msg:'Agent agt-analytics-02 exceeded 10 resource requests in 60s — escalation flagged', agent:'agt-analytics-02' },
  { type:'CONSENT_VIOLATION',severity:'HIGH',     msg:'Agent attempted to access data for dp-user-003 without valid consent grant', agent:'agt-crm-sync-01' },
  { type:'JIT_EXPIRED',      severity:'LOW',      msg:'JIT token for agt-hr-proc-03 expired after 5min — access auto-revoked', agent:'agt-hr-proc-03' },
  { type:'NORMAL',           severity:'INFO',     msg:'Agent agt-report-05 completed DPIA export — 0 violations found', agent:'agt-report-05' },
  { type:'PII_FLOW',         severity:'MEDIUM',   msg:'PAN card data detected traversing analytics pipeline — flagged for review', agent:'agt-analytics-02' },
  { type:'INJECTION_BLOCKED',severity:'HIGH',     msg:'SQL injection pattern blocked: "DROP TABLE employees" in agent payload', agent:'agt-shadow-04' },
  { type:'MODEL_INVERSION',  severity:'CRITICAL', msg:'Suspected model inversion attack: repeated queries reconstructing training data', agent:'agt-shadow-04' },
]

let eventCounter = 0
function generateEvent() {
  const tpl = EVENT_TEMPLATES[eventCounter % EVENT_TEMPLATES.length]
  eventCounter++
  return {
    ...tpl,
    id:        crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    blocked:   ['CRITICAL','HIGH'].includes(tpl.severity),
    pii_types: tpl.type === 'PII_FLOW' ? ['AADHAAR','EMAIL'] : [],
  }
}

// ── Custom Hooks ──────────────────────────────────────────────────────────────
export function useLiveEvents(maxEvents = 40) {
  const [events, setEvents] = useState(() => EVENT_TEMPLATES.slice(0,5).map((t,i) => ({
    ...t, id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - (5-i)*12000).toISOString(), blocked: true, pii_types:[]
  })))

  useEffect(() => {
    const interval = setInterval(() => {
      const e = generateEvent()
      setEvents(prev => [e, ...prev].slice(0, maxEvents))
    }, 2500)
    return () => clearInterval(interval)
  }, [maxEvents])

  return events
}

export function useMetrics() {
  const [metrics, setMetrics] = useState({
    riskScore: 67,
    threatsBlocked: 142,
    piiFlowsDetected: 38,
    injectionsBlocked: 7,
    shadowEndpoints: 2,
    complianceScore: 84,
    erasureProofs: 12,
    activeAgents: 4,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        riskScore:        Math.min(100, Math.max(10, prev.riskScore + Math.round((Math.random()-0.4)*3))),
        threatsBlocked:   prev.threatsBlocked + Math.round(Math.random()*2),
        piiFlowsDetected: prev.piiFlowsDetected + (Math.random() > 0.7 ? 1 : 0),
        complianceScore:  Math.min(100, Math.max(60, prev.complianceScore + Math.round((Math.random()-0.35)*1))),
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return metrics
}

export function useBurndown() {
  const [series, setSeries] = useState(() => {
    const now = Date.now()
    return Array.from({length: 20}, (_, i) => ({
      time: new Date(now - (19-i)*60000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
      critical: Math.floor(Math.random()*5 + 2),
      high:     Math.floor(Math.random()*8 + 4),
      medium:   Math.floor(Math.random()*10 + 6),
      total:    0
    })).map(d => ({...d, total: d.critical + d.high + d.medium}))
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSeries(prev => {
        const last = prev[prev.length - 1]
        const newPoint = {
          time:     new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
          critical: Math.max(0, last.critical + Math.round((Math.random()-0.6)*2)),
          high:     Math.max(0, last.high     + Math.round((Math.random()-0.5)*2)),
          medium:   Math.max(0, last.medium   + Math.round((Math.random()-0.4)*3)),
        }
        newPoint.total = newPoint.critical + newPoint.high + newPoint.medium
        return [...prev.slice(1), newPoint]
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return series
}

export { AGENTS, GATEWAY, UNLEARN, CTEM_URL }
