'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { FUNIL_ETAPAS, type Cliente, type FunilEtapa, type ClienteTimeline, type Empreendimento } from '@/types'

function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}

type Corretor = { id:string; name:string }

export default function ClientesPage() {
  const [clientes,setClientes]=useState<Cliente[]>([])
  const [total,setTotal]=useState(0)
  const [busca,setBusca]=useState('')
  const [etapa,setEtapa]=useState('')
  const [empId,setEmpId]=useState('todos')
  const [emps,setEmps]=useState<Empreendimento[]>([])
  const [corretores,setCorretores]=useState<Corretor[]>([])
  const [sel,setSel]=useState<Cliente|null>(null)
  const [tl,setTl]=useState<ClienteTimeline[]>([])
  const [nota,setNota]=useState('')
  const [novaEtapa,setNovaEtapa]=useState<FunilEtapa|''>('')
  const [novoCorretor,setNovoCorretor]=useState('')
  const [salvando,setSalvando]=useState(false)
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState({nome:'',telefone:'',origem:'outro',interesse:'',empreendimento_id:'',corretor_id:''})
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)

  const carregar=useCallback(async()=>{
    const p=new URLSearchParams({limit:'300'})
    if(busca)p.set('busca',busca)
    if(etapa)p.set('etapa',etapa)
    if(empId!=='todos')p.set('empreendimento_id',empId)
    const d=await fetch(`/api/clientes?${p}`).then(r=>r.json())
    setClientes(d.clientes??[])
    setTotal(d.total??0)
  },[busca,etapa,empId])

  useEffect(()=>{
    fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[]))
    fetch('/api/corretores').then(r=>r.json()).then(d=>setCorretores(d.corretores??[]))
  },[])
  useEffect(()=>{clearTimeout(timer.current);timer.current=setTimeout(carregar,300)},[carregar])

  async function abrir(c:Cliente){
    setSel(c);setNovaEtapa(c.etapa);setNovoCorretor(c.corretor_id??'')
    const d=await fetch(`/api/clientes/${c.id}`).then(r=>r.json())
    setTl(d.timeline??[])
  }

  async function salvar(){
    if(!sel)return
    setSalvando(true)
    const body:Record<string,unknown>={}
    if(novaEtapa&&novaEtapa!==sel.etapa)body.etapa=novaEtapa
    if(nota.trim())body.nota=nota.trim()
    if(novoCorretor!==sel.corretor_id)body.corretor_id=novoCorretor||null
    if(!Object.keys(body).length){setSalvando(false);return}
    await fetch(`/api/clientes/${sel.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    setNota('');await carregar()
    const d=await fetch(`/api/clientes/${sel.id}`).then(r=>r.json())
    setSel(d.cliente);setTl(d.timeline??[])
    setSalvando(false)
  }

  async function criar(e:React.FormEvent){
    e.preventDefault()
    const corNome=corretores.find(c=>c.id===form.corretor_id)?.name
    await fetch('/api/clientes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,empreendimento_id:form.empreendimento_id||null,corretor_id:form.corretor_id||null,corretor_nome:corNome})})
    setModal(false);setForm({nome:'',telefone:'',origem:'outro',interesse:'',empreendimento_id:'',corretor_id:''});carregar()
  }

  const eLabel=(e:string)=>FUNIL_ETAPAS.find(f=>f.value===e)?.label??e
  const eCor=(e:string)=>FUNIL_ETAPAS.find(f=>f.value===e)?.cor??'#888'

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'8px 16px',borderBottom:'0.5px solid var(--border)',background:'var(--bg)',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',flexShrink:0}}>
        <input type="text" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar nome, telefone, ID..." style={{fontSize:'12px',maxWidth:'200px',flex:1}}/>
        <select value={etapa} onChange={e=>setEtapa(e.target.value)} style={{fontSize:'12px',padding:'5px 8px'}}>
          <option value="">Todas as etapas</option>
          {FUNIL_ETAPAS.map(e=><option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={empId} onChange={e=>setEmpId(e.target.value)} style={{fontSize:'12px',padding:'5px 8px'}}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <span style={{fontSize:'12px',color:'var(--text-3)'}}>{total} clientes</span>
        <button onClick={()=>setModal(true)} style={{fontSize:'12px',padding:'5px 12px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',flexShrink:0}}>+ Novo</button>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
            <thead style={{position:'sticky',top:0,background:'var(--bg)',zIndex:1}}>
              <tr style={{borderBottom:'0.5px solid var(--border)'}}>
                {['ID','Nome','Telefone','Empreendimento','Etapa','Corretor','Atualizado'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(c=>{
                const cor=av(c.nome);const ec=eCor(c.etapa);const isS=sel?.id===c.id
                return(
                  <tr key={c.id} onClick={()=>abrir(c)} style={{borderBottom:'0.5px solid var(--border)',cursor:'pointer',background:isS?'var(--bg-2)':'transparent'}}
                    onMouseEnter={e=>{if(!isS)(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}}
                    onMouseLeave={e=>{if(!isS)(e.currentTarget as HTMLElement).style.background='transparent'}}>
                    <td style={{padding:'8px 12px',color:'var(--text-3)',whiteSpace:'nowrap'}}>#{String(c.id_amigavel).padStart(4,'0')}</td>
                    <td style={{padding:'8px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <div style={{width:'22px',height:'22px',borderRadius:'50%',background:cor.bg,color:cor.tx,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:500,flexShrink:0}}>{ini(c.nome)}</div>
                        <span style={{fontWeight:500,color:'var(--text)',whiteSpace:'nowrap'}}>{c.nome}</span>
                      </div>
                    </td>
                    <td style={{padding:'8px 12px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{c.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{(c as any).empreendimento?.slug??'—'}</td>
                    <td style={{padding:'8px 12px'}}><span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'20px',background:ec+'22',color:ec,whiteSpace:'nowrap',fontWeight:500}}>{eLabel(c.etapa)}</span></td>
                    <td style={{padding:'8px 12px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{(c as any).corretor?.name??<span style={{color:'var(--amber-text)'}}>Sem corretor</span>}</td>
                    <td style={{padding:'8px 12px',color:'var(--text-3)',whiteSpace:'nowrap',fontSize:'11px'}}>{new Date(c.updated_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {clientes.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'13px'}}>Nenhum cliente encontrado.</div>}
        </div>

        {sel&&(
          <div style={{width:'300px',flexShrink:0,borderLeft:'0.5px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}}>
            <div style={{padding:'10px 12px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'flex-start',gap:'7px',flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>{sel.nome}</div>
                <div style={{fontSize:'10px',color:'var(--text-3)'}}>#{String(sel.id_amigavel).padStart(4,'0')} · {(sel as any).empreendimento?.slug??'—'}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'14px',padding:'2px',flexShrink:0}} aria-label="Fechar">
                <i className="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px'}}>
                {[['Tel',sel.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')],['Origem',sel.origem.replace('_',' ')],['Interesse',sel.interesse??'—'],['Entrada',new Date(sel.created_at).toLocaleDateString('pt-BR')]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:'10px',color:'var(--text-3)'}}>{l}</div><div style={{fontSize:'11px',color:'var(--text)',textTransform:'capitalize'}}>{v}</div></div>
                ))}
              </div>

              <div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'3px'}}>Corretor responsável</div>
                <select value={novoCorretor} onChange={e=>setNovoCorretor(e.target.value)} style={{width:'100%',fontSize:'11px'}}>
                  <option value="">Sem corretor</option>
                  {corretores.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'3px'}}>Etapa</div>
                <select value={novaEtapa} onChange={e=>setNovaEtapa(e.target.value as FunilEtapa)} style={{width:'100%',fontSize:'11px'}}>
                  {FUNIL_ETAPAS.map(e=><option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

              <div>
                <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'3px'}}>Timeline</div>
                {tl.map(t=>(
                  <div key={t.id} style={{display:'flex',gap:'5px',paddingBottom:'5px',borderBottom:'0.5px solid var(--border)',marginBottom:'5px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:t.tipo==='mudanca_etapa'?eCor(t.etapa_para??''):'#888',marginTop:'3px',flexShrink:0}}></div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'11px',color:'var(--text)'}}>{t.tipo==='mudanca_etapa'?`→ ${eLabel(t.etapa_para??'')}`:t.tipo==='criacao'?'Cadastrado':'Nota'}</div>
                      {t.nota&&<div style={{fontSize:'10px',color:'var(--text-2)',fontStyle:'italic',padding:'2px 5px',background:'var(--bg-2)',borderRadius:'3px',marginTop:'2px'}}>{t.nota}</div>}
                      <div style={{fontSize:'10px',color:'var(--text-3)'}}>{new Date(t.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{(t as any).autor?` · ${(t as any).autor.name}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Adicionar observação..." style={{width:'100%',fontSize:'11px',minHeight:'50px',resize:'vertical'}}/>
                <div style={{display:'flex',gap:'5px',marginTop:'4px'}}>
                  <button onClick={()=>{setNota('');setNovoCorretor(sel.corretor_id??'')}} style={{flex:1,fontSize:'11px',padding:'4px'}}>Cancelar</button>
                  <button onClick={salvar} disabled={salvando} style={{flex:1,fontSize:'11px',padding:'4px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>{salvando?'...':'Salvar'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'400px',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>Novo cliente</span>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'16px'}}>✕</button>
            </div>
            <form onSubmit={criar} style={{padding:'14px',display:'flex',flexDirection:'column',gap:'9px'}}>
              <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Nome *</label><input required value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></div>
              <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Telefone *</label><input required value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))} placeholder="(75) 99999-0000"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Origem</label>
                  <select value={form.origem} onChange={e=>setForm(p=>({...p,origem:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
                    {['olx','chaves_na_mao','facebook_ads','ligacao','fluxo','trello','outro'].map(o=><option key={o} value={o}>{o.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Empreendimento</label>
                  <select value={form.empreendimento_id} onChange={e=>setForm(p=>({...p,empreendimento_id:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
                    <option value="">—</option>
                    {emps.map(e=><option key={e.id} value={e.id}>{e.slug}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Corretor responsável</label>
                <select value={form.corretor_id} onChange={e=>setForm(p=>({...p,corretor_id:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
                  <option value="">Sem corretor</option>
                  {corretores.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Interesse</label><input value={form.interesse} onChange={e=>setForm(p=>({...p,interesse:e.target.value}))} placeholder="ex: 2 quartos..."/></div>
              <div style={{display:'flex',gap:'7px',paddingTop:'2px'}}>
                <button type="button" onClick={()=>setModal(false)} style={{flex:1,padding:'7px',fontSize:'12px'}}>Cancelar</button>
                <button type="submit" style={{flex:1,padding:'7px',fontSize:'12px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
