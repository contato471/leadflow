'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Lead, LeadStatus } from '@/types'

const SL: Record<LeadStatus,string> = {novo:'Novo',em_atendimento:'Em atendimento',convertido:'Convertido',perdido:'Perdido'}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}
function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
function tempo(iso:string|null){if(!iso)return'';const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return'agora';if(m<60)return`há ${m}min`;const h=Math.floor(m/60);if(h<24)return`há ${h}h`;return`há ${Math.floor(h/24)}d`}

export default function FilaPage() {
  const [leads,setLeads]=useState<Lead[]>([])
  const [uid,setUid]=useState('')
  const [atualizando,setAtualizando]=useState<string|null>(null)
  const supabase=createBrowserSupabase()

  const carregar=useCallback(async()=>{
    const{data:{user:u}}=await supabase.auth.getUser()
    if(!u)return
    setUid(u.id)
    const{data}=await supabase.from('leads')
      .select('*,empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp),corretor:users(id,name,phone)')
      .eq('corretor_id',u.id).in('status',['novo','em_atendimento'])
      .order('atribuido_em',{ascending:true})
    setLeads((data as Lead[])??[])
  },[supabase])

  useEffect(()=>{
    carregar()
    const ch=supabase.channel('fila').on('postgres_changes',{event:'*',schema:'public',table:'leads'},carregar).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[carregar,supabase])

  async function atualizar(id:string,status:LeadStatus,whatsapp=false){
    setAtualizando(id)
    if(whatsapp){const{data}=await supabase.rpc('gerar_link_whatsapp',{p_lead_id:id});if(data)window.open(data,'_blank')}
    const up:Record<string,unknown>={status}
    if(status==='em_atendimento')up.atendimento_em=new Date().toISOString()
    if(status==='convertido'||status==='perdido')up.encerrado_em=new Date().toISOString()
    await supabase.from('leads').update(up).eq('id',id)
    await carregar()
    setAtualizando(null)
  }

  const novos=leads.filter(l=>l.status==='novo').length

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'8px'}}>
        {[{l:'Na fila',v:leads.length,c:'var(--text)'},{l:'Novos',v:novos,c:novos>0?'#BA7517':'var(--text)'},{l:'Atendendo',v:leads.filter(l=>l.status==='em_atendimento').length,c:'#378ADD'}].map(s=>(
          <div key={s.l} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px'}}>
            <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'3px'}}>{s.l}</div>
            <div style={{fontSize:'22px',fontWeight:500,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {leads.length===0
        ? <div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'14px'}}>Nenhum lead na fila. ✓</div>
        : leads.map(lead=>{
          const cor=av(lead.nome);const busy=atualizando===lead.id;const isNovo=lead.status==='novo'
          const emp=(lead as any).empreendimento
          return(
            <div key={lead.id} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px',opacity:busy?.6:1}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'10px',marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'10px',flex:1,minWidth:0}}>
                  <div style={{width:'38px',height:'38px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:500,flexShrink:0}}>{ini(lead.nome)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'15px',fontWeight:500,color:'var(--text)'}}>{lead.nome}</div>
                    <div style={{fontSize:'12px',color:'var(--text-2)',marginTop:'2px'}}>{emp?.nome??'—'}</div>
                  </div>
                </div>
                <span className={`badge badge-${lead.status==='em_atendimento'?'atendimento':lead.status}`} style={{fontSize:'11px',flexShrink:0}}>
                  {SL[lead.status]} · {tempo(lead.atribuido_em)}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                {[['Telefone',lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')],['Origem',lead.origem.replace('_',' ')],['Interesse',lead.interesse??'—'],['ID',lead.id_externo??lead.id.slice(0,8)]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:'11px',color:'var(--text-3)'}}>{l}</div><div style={{fontSize:'13px',color:'var(--text)',textTransform:'capitalize'}}>{v}</div></div>
                ))}
              </div>
              <div style={{display:'flex',gap:'6px'}}>
                <button className="btn-success" onClick={()=>atualizar(lead.id,'convertido')} disabled={busy} style={{flex:1,fontSize:'12px'}}>✓ Convertido</button>
                {isNovo&&<button onClick={()=>atualizar(lead.id,'em_atendimento',true)} disabled={busy} style={{flex:2,fontSize:'12px',fontWeight:500,background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>Iniciar + WhatsApp ↗</button>}
                <button className="btn-danger" onClick={()=>atualizar(lead.id,'perdido')} disabled={busy} style={{flex:1,fontSize:'12px'}}>✕ Perdido</button>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}
