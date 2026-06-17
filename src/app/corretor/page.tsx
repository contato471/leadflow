'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Lead, LeadStatus } from '@/types'

const SL: Record<LeadStatus,string> = {novo:'Novo',em_atendimento:'Em atendimento',convertido:'Convertido',perdido:'Perdido'}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}
function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
function tempo(iso:string|null){
  if(!iso)return''
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000)
  if(m<1)return'agora';if(m<60)return`há ${m}min`
  const h=Math.floor(m/60);if(h<24)return`há ${h}h`
  return`há ${Math.floor(h/24)}d`
}

export default function FilaPage() {
  const [leads,setLeads]=useState<Lead[]>([])
  const [uid,setUid]=useState('')
  const [atualizando,setAtualizando]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const supabase=createBrowserSupabase()

  const carregar=useCallback(async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u)return
    setUid(u.id)

    // Busca leads:
    // 1. Atribuídos a este corretor com status novo ou em_atendimento
    // 2. OU sem corretor e status novo (disponíveis para atendimento)
    const{data:meus}=await supabase
      .from('leads')
      .select('*,empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp),corretor:users(id,name)')
      .eq('corretor_id',u.id)
      .in('status',['novo','em_atendimento'])
      .order('atribuido_em',{ascending:true})

    const{data:semCorretor}=await supabase
      .from('leads')
      .select('*,empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp)')
      .is('corretor_id',null)
      .eq('status','novo')
      .order('created_at',{ascending:true})
      .limit(20)

    const todos=[...(meus??[]),...(semCorretor??[])]
    // Remove duplicatas por id
    const unique=todos.filter((l,i,arr)=>arr.findIndex(x=>x.id===l.id)===i)
    setLeads(unique as Lead[])
    setLoading(false)
  },[supabase])

  useEffect(()=>{
    carregar()
    const ch=supabase.channel('fila-corretor')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},carregar)
      .subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[carregar,supabase])

  async function atualizar(id:string,status:LeadStatus,whatsapp=false){
    setAtualizando(id)
    const up:Record<string,unknown>={status,corretor_id:uid}
    if(status==='em_atendimento'){up.atendimento_em=new Date().toISOString();up.atribuido_em=new Date().toISOString()}
    if(status==='convertido'||status==='perdido')up.encerrado_em=new Date().toISOString()
    await supabase.from('leads').update(up).eq('id',id)
    if(whatsapp){
      const{data}=await supabase.rpc('gerar_link_whatsapp',{p_lead_id:id})
      if(data)window.open(data,'_blank')
    }
    await carregar()
    setAtualizando(null)
  }

  const meus=leads.filter(l=>(l as any).corretor_id===uid)
  const disponiveis=leads.filter(l=>!(l as any).corretor_id)
  const novos=leads.filter(l=>l.status==='novo').length

  if(loading)return<div className="loading">Carregando...</div>

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'16px'}}>
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
        {[
          {l:'Na minha fila',v:meus.length,c:'var(--text)'},
          {l:'Novos',v:novos,c:novos>0?'#BA7517':'var(--text)'},
          {l:'Disponíveis',v:disponiveis.length,c:disponiveis.length>0?'#378ADD':'var(--text)'},
        ].map(s=>(
          <div key={s.l} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
            <div style={{fontSize:'var(--fs-xs)',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
            <div style={{fontSize:'var(--fs-xl)',fontWeight:600,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Leads disponíveis (sem corretor) */}
      {disponiveis.length > 0 && (
        <div>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#378ADD',display:'inline-block'}}></span>
            Leads disponíveis — pegue um!
          </div>
          {disponiveis.map(lead=>{
            const cor=av(lead.nome);const busy=atualizando===lead.id
            const emp=(lead as any).empreendimento
            return(
              <div key={lead.id} style={{background:'var(--bg)',border:'1.5px solid #378ADD',borderRadius:'var(--radius-lg)',padding:'16px',marginBottom:'10px',opacity:busy?.6:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:500,flexShrink:0}}>{ini(lead.nome)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)'}}>{lead.nome}</div>
                    <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)'}}>{emp?.nome??'—'}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
                  <div><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Telefone</div><div style={{fontSize:'var(--fs-sm)',fontWeight:500}}>{lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}</div></div>
                  <div><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Origem</div><div style={{fontSize:'var(--fs-sm)',textTransform:'capitalize'}}>{lead.origem.replace('_',' ')}</div></div>
                  {lead.interesse&&<div style={{gridColumn:'span 2'}}><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Interesse</div><div style={{fontSize:'var(--fs-sm)'}}>{lead.interesse}</div></div>}
                </div>
                <button
                  onClick={()=>atualizar(lead.id,'em_atendimento',true)}
                  disabled={busy}
                  style={{width:'100%',padding:'14px',fontSize:'var(--fs-base)',fontWeight:600,background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}
                >
                  ⚡ Pegar lead + Abrir WhatsApp
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Minha fila */}
      {meus.length > 0 && (
        <div>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:600,color:'var(--text)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--teal)',display:'inline-block'}}></span>
            Minha fila
          </div>
          {meus.map(lead=>{
            const cor=av(lead.nome);const busy=atualizando===lead.id;const isNovo=lead.status==='novo'
            const emp=(lead as any).empreendimento
            return(
              <div key={lead.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'16px',marginBottom:'10px',opacity:busy?.6:1}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'10px',marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1}}>
                    <div style={{width:'44px',height:'44px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:500,flexShrink:0}}>{ini(lead.nome)}</div>
                    <div>
                      <div style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)'}}>{lead.nome}</div>
                      <div style={{fontSize:'var(--fs-sm)',color:'var(--text-2)'}}>{emp?.nome??'—'}</div>
                    </div>
                  </div>
                  <span className={`badge badge-${lead.status==='em_atendimento'?'atendimento':lead.status}`}>
                    {SL[lead.status]} {tempo(lead.atribuido_em)&&`· ${tempo(lead.atribuido_em)}`}
                  </span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
                  <div><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Telefone</div><div style={{fontSize:'var(--fs-sm)',fontWeight:500}}>{lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}</div></div>
                  <div><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Origem</div><div style={{fontSize:'var(--fs-sm)',textTransform:'capitalize'}}>{lead.origem.replace('_',' ')}</div></div>
                  {lead.interesse&&<div style={{gridColumn:'span 2'}}><div style={{fontSize:'var(--fs-xs)',color:'var(--text-3)'}}>Interesse</div><div style={{fontSize:'var(--fs-sm)'}}>{lead.interesse}</div></div>}
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button className="btn-success" onClick={()=>atualizar(lead.id,'convertido')} disabled={busy} style={{flex:1,fontSize:'var(--fs-sm)',padding:'12px'}}>✓ Convertido</button>
                  {isNovo&&<button onClick={()=>atualizar(lead.id,'em_atendimento',true)} disabled={busy} style={{flex:2,fontSize:'var(--fs-sm)',padding:'12px',fontWeight:600,background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>Iniciar + WhatsApp ↗</button>}
                  <button className="btn-danger" onClick={()=>atualizar(lead.id,'perdido')} disabled={busy} style={{flex:1,fontSize:'var(--fs-sm)',padding:'12px'}}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {leads.length===0&&(
        <div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'var(--fs-base)'}}>
          <div style={{fontSize:'32px',marginBottom:'8px'}}>✓</div>
          Nenhum lead na fila.
        </div>
      )}
    </div>
  )
}
