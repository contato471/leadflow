'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Lead, LeadStatus, Empreendimento } from '@/types'

const STATUS_LABEL: Record<LeadStatus,string> = {novo:'Novo',em_atendimento:'Em atendimento',convertido:'Convertido',perdido:'Perdido'}
const STATUS_COR: Record<LeadStatus,string> = {novo:'#888780',em_atendimento:'#378ADD',convertido:'#1D9E75',perdido:'#E24B4A'}
const STATUS_BG: Record<LeadStatus,string> = {novo:'#F0EFEB',em_atendimento:'#E6F1FB',convertido:'#E1F5EE',perdido:'#FCEBEB'}

function tempoRelativo(iso:string){
  const min=Math.floor((Date.now()-new Date(iso).getTime())/60000)
  if(min<1)return'agora';if(min<60)return`há ${min}min`
  const h=Math.floor(min/60);if(h<24)return`há ${h}h`
  return`há ${Math.floor(h/24)}d`
}

export default function LeadsPage() {
  const [leads,setLeads]=useState<Lead[]>([])
  const [emps,setEmps]=useState<Empreendimento[]>([])
  const [filtroEmp,setFiltroEmp]=useState('todos')
  const [filtroStatus,setFiltroStatus]=useState('todos')
  const [busca,setBusca]=useState('')
  const [loading,setLoading]=useState(true)
  const [syncing,setSyncing]=useState(false)

  const carregar=useCallback(async()=>{
    const params=new URLSearchParams()
    if(filtroStatus!=='todos')params.set('status',filtroStatus)
    if(filtroEmp!=='todos')params.set('empreendimento_id',filtroEmp)
    const [leadsRes,empsRes]=await Promise.all([
      fetch(`/api/leads?${params}`).then(r=>r.json()),
      fetch('/api/empreendimentos').then(r=>r.json()),
    ])
    setLeads(leadsRes.leads??[])
    setEmps(empsRes.empreendimentos??[])
    setLoading(false)
  },[filtroStatus,filtroEmp])

  useEffect(()=>{carregar()},[carregar])

  const filtrados=leads.filter(l=>{
    if(busca){const b=busca.toLowerCase();return l.nome.toLowerCase().includes(b)||l.telefone.includes(busca)}
    return true
  })

  const hoje=new Date().toDateString()
  const stats={
    hoje:leads.filter(l=>new Date(l.created_at).toDateString()===hoje).length,
    aguardando:leads.filter(l=>l.status==='novo'&&!(l as any).corretor_id).length,
    atendimento:leads.filter(l=>l.status==='em_atendimento').length,
    convertidos:leads.filter(l=>l.status==='convertido'&&new Date((l as any).encerrado_em??'').toDateString()===hoje).length,
    taxa:leads.length>0?((leads.filter(l=>l.status==='convertido').length/leads.length)*100).toFixed(1):'0',
  }

  async function sincronizar(){setSyncing(true);await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:'leadflow_sync_prime_2024'})});await carregar();setSyncing(false)}
  async function distribuir(id:string){await fetch(`/api/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({distribuir:true})});await carregar()}

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      {/* KPIs - usando flex em vez de grid para evitar colapso */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {[
          {l:'Leads hoje',v:stats.hoje,c:'var(--text)'},
          {l:'Aguardando',v:stats.aguardando,c:'#BA7517'},
          {l:'Em atendimento',v:stats.atendimento,c:'#378ADD'},
          {l:'Convertidos hoje',v:stats.convertidos,c:'#1D9E75'},
          {l:'Taxa de conversão',v:`${stats.taxa}%`,c:'var(--text)'},
        ].map(s=>(
          <div key={s.l} style={{flex:'1 1 140px',minWidth:'120px',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
            <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
            <div style={{fontSize:'22px',fontWeight:600,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px 14px',alignItems:'center'}}>
        <input type="text" placeholder="Buscar por nome..." value={busca} onChange={e=>setBusca(e.target.value)} style={{maxWidth:'200px',flex:1}}/>
        <select value={filtroEmp} onChange={e=>setFiltroEmp(e.target.value)} style={{padding:'8px'}}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{padding:'8px'}}>
          <option value="todos">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="em_atendimento">Em atendimento</option>
          <option value="convertido">Convertido</option>
          <option value="perdido">Perdido</option>
        </select>
        <span style={{fontSize:'12px',color:'var(--text-3)'}}>{filtrados.length} leads</span>
        <button onClick={sincronizar} disabled={syncing} style={{padding:'8px 14px',whiteSpace:'nowrap'}}>
          {syncing?'Sincronizando...':'↻ Sincronizar'}
        </button>
      </div>

      {/* Tabela */}
      {loading?(
        <div className="loading">Carregando...</div>
      ):(
        <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'700px'}}>
              <thead>
                <tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--bg)'}}>
                  {['Nome','Empreendimento','Telefone','Origem','Corretor','Status','Recebido','Ação'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(lead=>(
                  <tr key={lead.id} style={{borderBottom:'0.5px solid var(--border)'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                    <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text)',whiteSpace:'nowrap'}}>{lead.nome}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{(lead as any).empreendimento?.slug??'—'}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)',whiteSpace:'nowrap',textTransform:'capitalize'}}>{lead.origem.replace('_',' ')}</td>
                    <td style={{padding:'10px 14px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{(lead as any).corretor?.name??<span style={{color:'var(--amber-text)'}}>Sem corretor</span>}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:STATUS_BG[lead.status],color:STATUS_COR[lead.status],fontWeight:500,whiteSpace:'nowrap'}}>
                        {STATUS_LABEL[lead.status]}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px',color:'var(--text-3)',fontSize:'11px',whiteSpace:'nowrap'}}>{tempoRelativo(lead.created_at)}</td>
                    <td style={{padding:'10px 14px'}}>
                      {!(lead as any).corretor_id&&lead.status==='novo'&&(
                        <button onClick={()=>distribuir(lead.id)} style={{fontSize:'11px',padding:'4px 8px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',whiteSpace:'nowrap'}}>
                          Distribuir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length===0&&<div className="empty">Nenhum lead encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
