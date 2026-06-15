'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { FUNIL_ETAPAS, type Cliente, type FunilEtapa, type ClienteTimeline, type Empreendimento } from '@/types'

function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
function dias(iso:string){return Math.floor((Date.now()-new Date(iso).getTime())/86400000)}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}

export default function FunilPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sel, setSel] = useState<Cliente|null>(null)
  const [tl, setTl] = useState<ClienteTimeline[]>([])
  const [nota, setNota] = useState('')
  const [novaEtapa, setNovaEtapa] = useState<FunilEtapa|''>('')
  const [salvando, setSalvando] = useState(false)
  const [empId, setEmpId] = useState('todos')
  const [emps, setEmps] = useState<Empreendimento[]>([])

  const carregar = useCallback(async () => {
    const p = new URLSearchParams({limit:'500'})
    if (empId !== 'todos') p.set('empreendimento_id', empId)
    const res = await fetch(`/api/clientes?${p}`)
    const d = await res.json()
    setClientes(d.clientes ?? [])
  }, [empId])

  useEffect(() => { fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[])) }, [])
  useEffect(() => { carregar() }, [carregar])

  async function abrir(c: Cliente) {
    setSel(c); setNovaEtapa(c.etapa)
    const d = await fetch(`/api/clientes/${c.id}`).then(r=>r.json())
    setTl(d.timeline ?? [])
  }

  async function salvar() {
    if (!sel) return
    setSalvando(true)
    const body: Record<string,unknown> = {}
    if (novaEtapa && novaEtapa !== sel.etapa) body.etapa = novaEtapa
    if (nota.trim()) body.nota = nota.trim()
    if (!Object.keys(body).length) { setSalvando(false); return }
    await fetch(`/api/clientes/${sel.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    setNota('')
    await carregar()
    const d = await fetch(`/api/clientes/${sel.id}`).then(r=>r.json())
    setSel(d.cliente); setTl(d.timeline ?? [])
    setSalvando(false)
  }

  const eLabel = (e:string) => FUNIL_ETAPAS.find(f=>f.value===e)?.label ?? e
  const eCor = (e:string) => FUNIL_ETAPAS.find(f=>f.value===e)?.cor ?? '#888'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'8px 16px',borderBottom:'0.5px solid var(--border)',background:'var(--bg)',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
        <span style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>Funil de vendas</span>
        <span style={{fontSize:'12px',color:'var(--text-3)'}}>{clientes.length} clientes</span>
        <select value={empId} onChange={e=>setEmpId(e.target.value)} style={{marginLeft:'auto',fontSize:'12px',padding:'4px 8px'}}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
      </div>

      <div style={{flex:1,display:'flex',overflowX:'auto',overflowY:'hidden',position:'relative'}}>
        {FUNIL_ETAPAS.map(etapa => {
          const cols = clientes.filter(c=>c.etapa===etapa.value)
          return (
            <div key={etapa.value} style={{flexShrink:0,width:'175px',display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)'}}>
              <div style={{padding:'8px 10px',borderBottom:'0.5px solid var(--border)',flexShrink:0,background:'var(--bg)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:etapa.cor,flexShrink:0}}></div>
                  <span style={{fontSize:'11px',fontWeight:500,color:'var(--text)'}}>{etapa.label}</span>
                </div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginTop:'2px'}}>{cols.length} cliente{cols.length!==1?'s':''}</div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'5px',display:'flex',flexDirection:'column',gap:'4px',background:'var(--bg-3)'}}>
                {cols.map(c=>{
                  const d=dias(c.updated_at)
                  const dc=d<=2?'#1D9E75':d<=5?'#BA7517':'#E24B4A'
                  const db=d<=2?'#E1F5EE':d<=5?'#FAEEDA':'#FCEBEB'
                  const cor=av(c.nome)
                  return (
                    <div key={c.id} onClick={()=>abrir(c)} style={{background:'var(--bg)',border:`0.5px solid ${sel?.id===c.id?etapa.cor:'var(--border)'}`,borderRadius:'var(--radius)',padding:'7px',cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
                        <div style={{width:'20px',height:'20px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',fontWeight:500,flexShrink:0}}>{ini(c.nome)}</div>
                        <span style={{fontSize:'11px',fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.nome}</span>
                      </div>
                      <div style={{fontSize:'10px',color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'3px'}}>{(c as any).empreendimento?.slug??'—'}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:'10px',color:'var(--text-3)'}}>{(c as any).corretor?.name?.split(' ')[0]??'—'}</span>
                        <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'20px',background:db,color:dc}}>{d}d</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {sel && (
          <div style={{position:'absolute',top:0,right:0,bottom:0,width:'320px',background:'var(--bg)',borderLeft:'0.5px solid var(--border)',display:'flex',flexDirection:'column',zIndex:20,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'flex-start',gap:'8px',flexShrink:0}}>
              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:av(sel.nome).bg,color:av(sel.nome).tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:500,flexShrink:0}}>{ini(sel.nome)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>{sel.nome}</div>
                <div style={{fontSize:'10px',color:'var(--text-3)'}}>#{String(sel.id_amigavel).padStart(4,'0')} · {(sel as any).empreendimento?.slug??'—'}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'15px',padding:'2px',flexShrink:0}} aria-label="Fechar">
                <i className="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                {[['Tel',sel.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')],['Origem',sel.origem.replace('_',' ')],['Interesse',sel.interesse??'—'],['Entrada',new Date(sel.created_at).toLocaleDateString('pt-BR')]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:'10px',color:'var(--text-3)'}}>{l}</div><div style={{fontSize:'11px',color:'var(--text)',textTransform:'capitalize'}}>{v}</div></div>
                ))}
              </div>
              {(sel as any).corretor && (
                <div style={{display:'flex',alignItems:'center',gap:'7px',padding:'7px',background:'var(--bg-2)',borderRadius:'var(--radius)'}}>
                  <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'#E6F1FB',color:'#0C447C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:500}}>{ini((sel as any).corretor.name)}</div>
                  <div><div style={{fontSize:'11px',fontWeight:500,color:'var(--text)'}}>{(sel as any).corretor.name}</div><div style={{fontSize:'10px',color:'var(--text-3)'}}>Corretor responsável</div></div>
                </div>
              )}
              <div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'4px'}}>Mover etapa</div>
                <select value={novaEtapa} onChange={e=>setNovaEtapa(e.target.value as FunilEtapa)} style={{width:'100%',fontSize:'12px'}}>
                  {FUNIL_ETAPAS.map(e=><option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'4px'}}>Timeline</div>
                {tl.map(t=>(
                  <div key={t.id} style={{display:'flex',gap:'6px',paddingBottom:'6px',borderBottom:'0.5px solid var(--border)',marginBottom:'6px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:t.tipo==='mudanca_etapa'?eCor(t.etapa_para??''):'#888',marginTop:'4px',flexShrink:0}}></div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'11px',color:'var(--text)'}}>{t.tipo==='mudanca_etapa'?`→ ${eLabel(t.etapa_para??'')}`:t.tipo==='criacao'?'Cadastrado':'Nota'}</div>
                      {t.nota && <div style={{fontSize:'10px',color:'var(--text-2)',fontStyle:'italic',margin:'2px 0',padding:'3px 6px',background:'var(--bg-2)',borderRadius:'4px'}}>{t.nota}</div>}
                      <div style={{fontSize:'10px',color:'var(--text-3)'}}>{new Date(t.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{(t as any).autor?` · ${(t as any).autor.name}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Adicionar observação..." style={{width:'100%',fontSize:'11px',minHeight:'52px',resize:'vertical'}}/>
                <div style={{display:'flex',gap:'5px',marginTop:'5px'}}>
                  <button onClick={()=>setNota('')} style={{flex:1,fontSize:'11px',padding:'5px'}}>Limpar</button>
                  <button onClick={salvar} disabled={salvando} style={{flex:1,fontSize:'11px',padding:'5px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>{salvando?'...':'Salvar'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
