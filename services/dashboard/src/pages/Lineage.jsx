import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const LINEAGE_DATA = {
  nodes: [
    { id: 'crm',        label: 'CRM App',               type: 'source',    icon: '🏢', pii: true  },
    { id: 'hr',         label: 'HR Portal',              type: 'source',    icon: '👥', pii: true  },
    { id: 'analytics',  label: 'Analytics Platform',     type: 'source',    icon: '📊', pii: false },
    { id: 'rag',        label: 'RAG Pipeline',           type: 'transform', icon: '⚙️', pii: true  },
    { id: 'vectordb',   label: 'ChromaDB Vector Store',  type: 'store',     icon: '🗄️', pii: true  },
    { id: 'gateway',    label: 'Zero-Trust Gateway',     type: 'security',  icon: '🛡️', pii: false },
    { id: 'llm',        label: 'LLM Inference API',      type: 'inference', icon: '🤖', pii: false },
    { id: 'output',     label: 'Agent Output',           type: 'sink',      icon: '📤', pii: false },
    { id: 'datalake',   label: 'Data Lake',              type: 'store',     icon: '🪣', pii: false },
    { id: 'shadow',     label: '⚠️ Shadow AI Endpoint',  type: 'shadow',    icon: '👻', pii: true  },
  ],
  links: [
    { source:'crm',       target:'rag',      value:450, pii:true  },
    { source:'hr',        target:'rag',      value:280, pii:true  },
    { source:'analytics', target:'datalake', value:620, pii:false },
    { source:'rag',       target:'vectordb', value:730, pii:true  },
    { source:'vectordb',  target:'gateway',  value:590, pii:true  },
    { source:'gateway',   target:'llm',      value:580, pii:false },
    { source:'llm',       target:'output',   value:580, pii:false },
    { source:'analytics', target:'shadow',   value:120, pii:true  },
    { source:'crm',       target:'datalake', value:200, pii:false },
  ]
}

const TYPE_COLOR = {
  source:    '#4f9cf9',
  transform: '#a78bfa',
  store:     '#fbbf24',
  security:  '#4ade80',
  inference: '#22d3ee',
  sink:      '#94a3b8',
  shadow:    '#f43f5e',
}

export default function Lineage() {
  const svgRef = useRef()
  const [selected, setSelected] = useState(null)
  const [showPiiOnly, setShowPiiOnly] = useState(false)
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const W = el.clientWidth || 900, H = 500

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%').attr('height', H)

    // Defs
    const defs = svg.append('defs')
    const filt = defs.append('filter').attr('id','glow')
    filt.append('feGaussianBlur').attr('stdDeviation','3').attr('result','coloredBlur')
    const merge = filt.append('feMerge')
    merge.append('feMergeNode').attr('in','coloredBlur')
    merge.append('feMergeNode').attr('in','SourceGraphic')

    // Arrow markers
    ;['pii','safe','blocked'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d','M0,-5L10,0L0,5')
        .attr('fill', type==='pii' ? '#f43f5e' : type==='blocked' ? '#fbbf24' : '#4ade80')
    })

    const nodes = LINEAGE_DATA.nodes.map(n => ({...n}))
    const links = LINEAGE_DATA.links
      .filter(l => !showPiiOnly || l.pii)
      .map(l => ({...l}))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collision', d3.forceCollide(55))

    // Links
    const link = svg.append('g').selectAll('path')
      .data(links).join('path')
      .attr('stroke', d => d.id === 'shadow' ? '#f43f5e' : d.pii ? '#f43f5e' : '#4ade80')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', d => Math.max(1.5, Math.sqrt(d.value / 80)))
      .attr('stroke-dasharray', d => d.source?.id === 'analytics' && d.target?.id === 'shadow' ? '6,4' : null)
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#arrow-${d.pii ? 'pii' : 'safe'})`)

    // Animated flow particles
    const particle = svg.append('g').selectAll('circle')
      .data(links.filter(l => l.pii)).join('circle')
      .attr('r', 3).attr('fill', '#f43f5e').attr('opacity', 0.7)

    // Nodes
    const node = svg.append('g').selectAll('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (e, d) => setSelected(d))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y })
        .on('drag', (e, d) => { d.fx=e.x; d.fy=e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null })
      )

    node.append('circle')
      .attr('r', 28)
      .attr('fill', d => `${TYPE_COLOR[d.type]}18`)
      .attr('stroke', d => d.type === 'shadow' ? '#f43f5e' : d.pii ? 'rgba(244,63,94,0.4)' : TYPE_COLOR[d.type])
      .attr('stroke-width', d => d.type === 'shadow' ? 2.5 : 1.5)
      .attr('filter', d => d.type === 'shadow' ? 'url(#glow)' : null)

    node.append('text').attr('text-anchor','middle').attr('dominant-baseline','central').attr('font-size', 16)
      .text(d => d.icon)

    node.append('text')
      .attr('text-anchor','middle').attr('y', 38)
      .attr('fill', 'var(--text-secondary)').attr('font-size', 10)
      .attr('font-family', 'Inter, sans-serif')
      .text(d => d.label)

    // PII labels on links
    const linkLabel = svg.append('g').selectAll('text')
      .data(links.filter(l => l.pii)).join('text')
      .attr('fill', '#f43f5e').attr('font-size', 9).attr('text-anchor', 'middle').attr('opacity', 0.7)
      .text(d => `${d.value} recs`)

    // Tick
    let t = 0
    sim.on('tick', () => {
      t++
      link.attr('d', d => {
        const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx*dx + dy*dy) * 1.5
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
      })
      node.attr('transform', d => `translate(${d.x},${d.y})`)
      linkLabel.attr('transform', d => `translate(${(d.source.x + d.target.x)/2},${(d.source.y + d.target.y)/2})`)

      // Animate particles along PII links
      if (animating) {
        particle.each(function(d, i) {
          const progress = ((t * 2 + i * 40) % 100) / 100
          const sx = d.source.x || 0, sy = d.source.y || 0
          const tx = d.target.x || 0, ty = d.target.y || 0
          d3.select(this)
            .attr('cx', sx + (tx - sx) * progress)
            .attr('cy', sy + (ty - sy) * progress)
            .attr('opacity', progress < 0.1 || progress > 0.9 ? 0 : 0.8)
        })
      }
    })

    return () => sim.stop()
  }, [showPiiOnly, animating])

  return (
    <div className="fade-in">
      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:16, flexWrap:'wrap'}}>
        <button className={`btn ${showPiiOnly ? 'btn-danger' : 'btn-ghost'} btn-sm`}
          onClick={() => setShowPiiOnly(v => !v)}>
          {showPiiOnly ? '🔴 PII Flows Only' : '📊 All Flows'}
        </button>
        <button className={`btn ${animating ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setAnimating(v => !v)}>
          {animating ? '⏸ Pause Animation' : '▶ Animate'}
        </button>
        <div style={{marginLeft:'auto', display:'flex', gap:16, fontSize:12, alignItems:'center'}}>
          {[
            {color:'#f43f5e', label:'PII-tainted flow'},
            {color:'#4ade80', label:'Safe flow'},
            {color:'#fbbf24', label:'Shadow AI (blocked)'},
          ].map(l => (
            <span key={l.label} style={{display:'flex', alignItems:'center', gap:5}}>
              <span style={{width:12, height:3, background:l.color, display:'inline-block', borderRadius:2}}/>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap:16}}>
        <div className="card" style={{padding:12}}>
          <svg ref={svgRef} style={{width:'100%'}} />
        </div>

        {selected && (
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">Node Detail</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div style={{textAlign:'center', marginBottom:16}}>
              <div style={{fontSize:40, marginBottom:8}}>{selected.icon}</div>
              <div style={{fontSize:16, fontWeight:700}}>{selected.label}</div>
              <span className={`status-badge ${selected.type === 'shadow' ? 'status-critical' : selected.pii ? 'status-high' : 'status-active'}`}>
                {selected.type.toUpperCase()}
              </span>
            </div>

            {selected.pii && (
              <div style={{background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:12}}>
                ⚠️ <strong style={{color:'var(--critical)'}}>PII Flows Through This Node</strong>
                <div style={{color:'var(--text-muted)', marginTop:4}}>Data minimization required per DPDP §9</div>
              </div>
            )}

            {selected.type === 'shadow' && (
              <div style={{background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:12}}>
                🚨 <strong style={{color:'var(--critical)'}}>SHADOW AI ENDPOINT DETECTED</strong>
                <div style={{color:'var(--text-muted)', marginTop:4}}>Unregistered agent calling external AI API with PII payload — blocked by CTEM filter</div>
              </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:6, fontSize:12}}>
              <div className="dpia-row">
                <span className="dpia-key">Node Type</span>
                <span className="dpia-val" style={{color:TYPE_COLOR[selected.type]}}>{selected.type}</span>
              </div>
              <div className="dpia-row">
                <span className="dpia-key">PII Risk</span>
                <span className="dpia-val" style={{color: selected.pii ? 'var(--critical)' : 'var(--accent-green)'}}>{selected.pii ? 'HIGH' : 'NONE'}</span>
              </div>
              <div className="dpia-row">
                <span className="dpia-key">DPDP Obligation</span>
                <span className="dpia-val">{selected.pii ? '§9 Data Min.' : 'N/A'}</span>
              </div>
            </div>

            <button className="btn btn-primary btn-sm" style={{width:'100%', marginTop:12}}>
              🛡️ Apply Remediation
            </button>
          </div>
        )}
      </div>

      {/* Flow Summary */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16}}>
        {[
          {label:'Total Data Flows',    val: LINEAGE_DATA.links.length,                    color:'var(--accent-blue)'},
          {label:'PII-Tainted Flows',   val: LINEAGE_DATA.links.filter(l=>l.pii).length,   color:'var(--critical)'},
          {label:'Shadow AI Flows',     val: 1,                                             color:'var(--accent-red)'},
          {label:'Records in Transit',  val: '3.2K',                                       color:'var(--accent-amber)'},
        ].map(s => (
          <div key={s.label} className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:28, fontWeight:800, color:s.color}}>{s.val}</div>
            <div style={{fontSize:11, color:'var(--text-muted)', marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
