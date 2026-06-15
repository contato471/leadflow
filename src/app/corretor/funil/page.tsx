'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { FUNIL_ETAPAS, type Cliente, type FunilEtapa, type ClienteTimeline } from '@/types'
function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
function dias(iso:string){return Math.floor((Date.now()-new Date(iso).getTime())/86400000)}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}
export default function CorretorFunilPage() {
  const [clientes,setClientes]=useState<Cliente[]>([])
  const [sel,setSel]=useState<Cliente|null>(null)
  const [tl,setTl]=useState<ClienteTimeline[]>([])
  const [nota,setNota]=useState('');const [novaEtapa,setNovaEtapa]=useState<FunilEtapa|''>('');const [salvando,setSalvando]=useState(false)
  const supabase=createBrowserSupabase()
  const carregar=useCallback(async()=>{const{data:{user:u}}=await supabase.auth.getUser();if(!u)return;const d=await fetch(`/api/clientes?corretor_id=${u.id}&limit=500`).then(r=>r.json());setClientes(d.clientes??[])},[supabase])
  useEffect(()=>{carregar()},[carregar])
  async function abrir(c:Cliente){setSel(c);setNovaEtapa(c.etapa);const d=await fetch(`/api/clientes/${c.id}`).then(r=>r.json());setTl(d.timeline??[])}
  async function salvar(){if(!sel)return;setSalvando(true);const body:Record<string,unknown>={};if(novaEtapa&&novaEtapa!==sel.etapa)body.etapa=novaEtapa;if(nota.trim())body.nota=nota.trim();if(!Object.keys(body).length){setSalvando(false);return};await fetch(`/api/clientes/${sel.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setNota('');await carregar();const d=await fetch(`/api/clientes/${sel.id}`).then(r=>r.json());setSel(d.cliente);setTl(d.timeline??[]);setSalvando(false)}
  const eLabel=(e:string)=>FUNIL_ETAPAS.find(f=>f.value===e)?.label??e
  const eCor=(e:string)=>FUNIL_ETAPAS.find(f=>f.value===e)?.cor??'#888'
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'8px 16px',borderBottom:'0.5px solid var(--border)',background:'var(--bg)',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
        <span style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>Meu funil</span>
        <span style={{fontSize:'12px',color:'var(--text-3)'}}>{clientes.length} clientes</span>
      </div>
      <div style={{flex:1,display:'flex',overflowX:'auto',overflowY:'hidden',position:'relative'}}>
        {FUNIL_ETAPAS.map(etapa=>{
          const cols=clientes.filter(c=>c.etapa===etapa.value)
          return (<div key={etapa.value} style={{flexShrink:0,width:'160px',display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)'}}>
            <div style={{padding:'7px 10px',borderBottom:'0.5px solid var(--border)',flexShrink:0,background:'var(--bg)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:etapa.cor,flexShrink:0}}></div><span style={{fontSize:'10px',fontWeight:500,color:'var(--text)'}}>{etapa.label}</span></div>
              <div style={{fontSize:'9px',color:'var(--text-3)',marginTop:'1px'}}>{cols.length}</div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'4px',display:'flex',flexDirection:'column',gap:'4px',background:'var(--bg-3)'}}>
              {cols.map(c=>{const d=dias(c.updated_at);const cor=av(c.nome);return(<div key={c.id} onClick={()=>abrir(c)} style={{background:'var(--bg)',border:`0.5px solid ${sel?.id===c.id?etapa.cor:'var(--border)'}`,borderRadius:'var(--radius)',padding:'6px',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'2px'}}><div style={{width:'18px',height:'18px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'7px',fontWeight:500,flexShrink:0}}>{ini(c.nome)}</div><span style={{fontSize:'10px',fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.nome}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:'9px',color:'var(--text-3)'}}>{(c as any).empreendimento?.slug??'—'}</span><span style={{fontSize:'8px',padding:'1px 4px',borderRadius:'20px',background:d<=2?'#E1F5EE':d<=5?'#FAEEDA':'#FCEBEB',color:d<=2?'#1D9E75':d<=5?'#BA7517':'#E24B4A'}}>{d}d</span></div>
              </div>)})}
            </div>
          </div>)
        })}
        {sel&&(<div style={{position:'absolute',top:0,right:0,bottom:0,width:'280px',background:'var(--bg)',borderLeft:'0.5px solid var(--border)',display:'flex',flexDirection:'column',zIndex:20,overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'7px',flexShrink:0}}>
            <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>{sel.nome}</div><div style={{fontSize:'10px',color:'var(--text-3)'}}>#{String(sel.id_amigavel).padStart(4,'0')}</div></div>
            <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'14px'}} aria-label="Fechar"><i className="ti ti-x" aria-hidden="true"></i></button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'8px'}}>
            <div><div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'3px'}}>Etapa</div><select value={novaEtapa} onChange={e=>setNovaEtapa(e.target.value as FunilEtapa)} style={{width:'100%',fontSize:'11px'}}>{FUNIL_ETAPAS.map(e=><option key={e.value} value={e.value}>{e.label}</option>)}</select></div>
            <div>{tl.map(t=>(<div key={t.id} style={{display:'flex',gap:'5px',paddingBottom:'5px',borderBottom:'0.5px solid var(--border)',marginBottom:'5px'}}><div style={{width:'5px',height:'5px',borderRadius:'50%',background:t.tipo==='mudanca_etapa'?eCor(t.etapa_para??''):'#888',marginTop:'3px',flexShrink:0}}></div><div style={{flex:1}}><div style={{fontSize:'10px',color:'var(--text)'}}>{t.tipo==='mudanca_etapa'?`→ ${eLabel(t.etapa_para??'')}`:t.tipo==='criacao'?'Cadastrado':'Nota'}</div>{t.nota&&<div style={{fontSize:'9px',color:'var(--text-2)',fontStyle:'italic',padding:'2px 4px',background:'var(--bg-2)',borderRadius:'3px',marginTop:'1px'}}>{t.nota}</div>}<div style={{fontSize:'9px',color:'var(--text-3)'}}>{new Date(t.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></div></div>))}</div>
            <div><textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Observação..." style={{width:'100%',fontSize:'11px',minHeight:'46px',resize:'vertical'}}/><div style={{display:'flex',gap:'4px',marginTop:'4px'}}><button onClick={()=>setNota('')} style={{flex:1,fontSize:'11px',padding:'4px'}}>Limpar</button><button onClick={salvar} disabled={salvando} style={{flex:1,fontSize:'11px',padding:'4px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>{salvando?'...':'Salvar'}</button></div></div>
          </div>
        </div>)}
      </div>
    </div>
  )
}
