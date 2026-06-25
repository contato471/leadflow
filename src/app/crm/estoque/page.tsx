'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const ST_BG = { disponivel:'#E1F5EE', reservado:'#FAEEDA', vendido:'#FCEBEB' }
const ST_COR = { disponivel:'#1D9E75', reservado:'#BA7517', vendido:'#E24B4A' }
const ST_LABEL = { disponivel:'Disponível', reservado:'Reservado', vendido:'Vendido' }
function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function moedaK(v:number){if(v>=1e6)return`R$ ${(v/1e6).toFixed(1)}M`;if(v>=1e3)return`R$ ${(v/1e3).toFixed(0)}K`;return moeda(v)}
type Opcoes={entrada_dividida:boolean;parcelas_intermediarias:boolean;parcelas_semestrais:boolean;parcelas_anuais:boolean}
type Sim={entrada_pct:string;entrada_rs:string;parcelas:string;int_val:string;int_qtd:string;sem_val:string;sem_qtd:string;anu_val:string;anu_qtd:string;div_qtd:string}

export default function EstoqueAdmPage() {
  const [unidades,setUnidades]=useState<Unidade[]>([])
  const [emps,setEmps]=useState<Empreendimento[]>([])
  const [empFiltro,setEmpFiltro]=useState('todos')
  const [statusFiltro,setStatusFiltro]=useState('todos')
  const [busca,setBusca]=useState('')
  const [modalNovo,setModalNovo]=useState(false)
  const [modalEdit,setModalEdit]=useState<Unidade|null>(null)
  const [modalExcluir,setModalExcluir]=useState<Unidade|null>(null)
  const [modalSim,setModalSim]=useState<Unidade|null>(null)
  const [excluindo,setExcluindo]=useState(false)
  const [salvando,setSalvando]=useState(false)
  const [copiado,setCopiado]=useState(false)
  const [reservado,setReservado]=useState(false)
  const [form,setForm]=useState({empreendimento_id:'',nome:'',area_m2:'',valor_total:'',status:'disponivel',observacao:''})
  const [opcoes,setOpcoes]=useState<Opcoes>({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false})
  const [sim,setSim]=useState<Sim>({entrada_pct:'',entrada_rs:'',parcelas:'',int_val:'',int_qtd:'',sem_val:'',sem_qtd:'',anu_val:'',anu_qtd:'',div_qtd:''})
  const [abaView,setAbaView]=useState<'dashboard'|'lista'>('dashboard')

  const carregar=useCallback(async()=>{
    const p=new URLSearchParams()
    if(empFiltro!=='todos')p.set('empreendimento_id',empFiltro)
    if(statusFiltro!=='todos')p.set('status',statusFiltro)
    const d=await fetch(`/api/unidades?${p}`).then(r=>r.json())
    setUnidades(d.unidades??[])
  },[empFiltro,statusFiltro])

  useEffect(()=>{fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[]))},[])
  useEffect(()=>{carregar()},[carregar])

  // Dashboard stats
  const disp=unidades.filter(u=>u.status==='disponivel')
  const resv=unidades.filter(u=>u.status==='reservado')
  const vend=unidades.filter(u=>u.status==='vendido')
  const valorEstoque=disp.reduce((s,u)=>s+u.valor_total,0)
  const valorVendido=vend.reduce((s,u)=>s+u.valor_total,0)
  const valorTotal=unidades.reduce((s,u)=>s+u.valor_total,0)

  // Por empreendimento
  const porEmp=emps.map(e=>{
    const uns=unidades.filter(u=>u.empreendimento_id===e.id)
    return{
      ...e,
      total:uns.length,
      disponiveis:uns.filter(u=>u.status==='disponivel').length,
      reservados:uns.filter(u=>u.status==='reservado').length,
      vendidos:uns.filter(u=>u.status==='vendido').length,
      valorDisp:uns.filter(u=>u.status==='disponivel').reduce((s,u)=>s+u.valor_total,0),
    }
  }).filter(e=>e.total>0).sort((a,b)=>b.total-a.total)

  async function salvarNovo(e:React.FormEvent){
    e.preventDefault();setSalvando(true)
    await fetch('/api/unidades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,area_m2:form.area_m2?parseFloat(form.area_m2):null,valor_total:parseFloat(form.valor_total)})})
    setSalvando(false);setModalNovo(false);setForm({empreendimento_id:'',nome:'',area_m2:'',valor_total:'',status:'disponivel',observacao:''});carregar()
  }

  async function salvarEdit(e:React.FormEvent){
    e.preventDefault();if(!modalEdit)return;setSalvando(true)
    await fetch(`/api/unidades/${modalEdit.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,area_m2:form.area_m2?parseFloat(form.area_m2):null,valor_total:parseFloat(form.valor_total)})})
    setSalvando(false);setModalEdit(null);carregar()
  }

  async function excluir(){
    if(!modalExcluir)return;setExcluindo(true)
    await fetch(`/api/unidades/${modalExcluir.id}`,{method:'DELETE'})
    setExcluindo(false);setModalExcluir(null);carregar()
  }

  async function alterarStatus(id:string,status:string){
    await fetch(`/api/unidades/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});carregar()
  }

  function abrirEdit(u:Unidade){setModalEdit(u);setForm({empreendimento_id:u.empreendimento_id,nome:u.nome,area_m2:u.area_m2?String(u.area_m2):'',valor_total:String(u.valor_total),status:u.status,observacao:u.observacao??''})}
  function abrirSim(u:Unidade){setModalSim(u);setReservado(false);setCopiado(false);setOpcoes({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false});setSim({entrada_pct:'',entrada_rs:'',parcelas:'',int_val:'',int_qtd:'',sem_val:'',sem_qtd:'',anu_val:'',anu_qtd:'',div_qtd:''})}

  const vT=modalSim?.valor_total??0
  const eRS=sim.entrada_rs?parseFloat(sim.entrada_rs):sim.entrada_pct?(vT*parseFloat(sim.entrada_pct)/100):0
  const ePct=vT>0?((eRS/vT)*100):0
  const dQ=parseInt(sim.div_qtd)||0;const eDivP=dQ>0&&eRS>0?eRS/dQ:0
  const iV=parseFloat(sim.int_val)||0;const iQ=parseInt(sim.int_qtd)||0
  const sV=parseFloat(sim.sem_val)||0;const sQ=parseInt(sim.sem_qtd)||0
  const aV=parseFloat(sim.anu_val)||0;const aQ=parseInt(sim.anu_qtd)||0
  const totAdd=(iV*iQ)+(sV*sQ)+(aV*aQ)
  const rest=Math.max(vT-eRS-totAdd,0);const pQ=parseInt(sim.parcelas)||0
  const pV=pQ>0&&rest>0?rest/pQ:0;const simOk=eRS>0||pQ>0

  function gerarMsg(){
    if(!modalSim)return''
    const emp=(modalSim as any).empreendimento
    const l=[`📍 *${emp?.nome??modalSim.nome}*`,`🔹 Lote: ${modalSim.nome}`]
    if(modalSim.area_m2)l.push(`📐 Área: ${modalSim.area_m2} m²`)
    l.push(`💰 Valor total: *${moeda(vT)}*`,'','━━━━━━━━━━━━━━━━━','')
    if(opcoes.entrada_dividida&&dQ>0&&eRS>0){l.push('✅ *Entrada dividida:*');l.push(`   ${dQ}x de ${moeda(eDivP)} = ${moeda(eRS)} (${ePct.toFixed(1)}%)`)}
    else if(eRS>0)l.push(`✅ *Entrada:* ${moeda(eRS)} (${ePct.toFixed(1)}%)`)
    if(opcoes.parcelas_intermediarias&&iQ>0&&iV>0)l.push(`📅 *Intermediárias:* ${iQ}x de ${moeda(iV)} = ${moeda(iV*iQ)}`)
    if(opcoes.parcelas_semestrais&&sQ>0&&sV>0)l.push(`📆 *Semestrais:* ${sQ}x de ${moeda(sV)} = ${moeda(sV*sQ)}`)
    if(opcoes.parcelas_anuais&&aQ>0&&aV>0)l.push(`🗓️ *Anuais:* ${aQ}x de ${moeda(aV)} = ${moeda(aV*aQ)}`)
    if(pQ>0&&pV>0)l.push(`💳 *Saldo:* ${pQ}x de *${moeda(pV)}*`)
    l.push('','━━━━━━━━━━━━━━━━━','',`• Total: ${moeda(vT)}`)
    if(eRS>0)l.push(`• Entrada: ${moeda(eRS)}`)
    if(pQ>0)l.push(`• Saldo: ${pQ}x de ${moeda(pV)}`)
    l.push('','Qualquer dúvida, estou à disposição! 😊','_Prime Empreendimentos_')
    return l.join('\n')
  }

  async function copiar(){await navigator.clipboard.writeText(gerarMsg());setCopiado(true);setTimeout(()=>setCopiado(false),3000)}
  async function reservar(){if(!modalSim)return;await fetch(`/api/unidades/${modalSim.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'reservado'})});setReservado(true);carregar()}

  const filtrados=unidades.filter(u=>!busca||(u.nome.toLowerCase().includes(busca.toLowerCase())||(u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase())))

  const formFields=(isEdit=false)=>(
    <form onSubmit={isEdit?salvarEdit:salvarNovo} style={{padding:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
      <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Empreendimento *</label>
        <select required value={form.empreendimento_id} onChange={e=>setForm(p=>({...p,empreendimento_id:e.target.value}))}>
          <option value="">Selecione...</option>{emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select></div>
      <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Nome / Número do lote *</label><input required value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="ex: Lote 15, Quadra A"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Área (m²)</label><input type="number" value={form.area_m2} onChange={e=>setForm(p=>({...p,area_m2:e.target.value}))} placeholder="ex: 250"/></div>
        <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Valor total (R$) *</label><input required type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))} placeholder="ex: 85000"/></div>
      </div>
      <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Status</label>
        <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
          <option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option>
        </select></div>
      <div><label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'4px'}}>Observação</label><textarea value={form.observacao} onChange={e=>setForm(p=>({...p,observacao:e.target.value}))} style={{minHeight:'48px',resize:'vertical'}}/></div>
      <div style={{display:'flex',gap:'8px',paddingTop:'4px'}}>
        <button type="button" onClick={()=>isEdit?setModalEdit(null):setModalNovo(false)} style={{flex:1,padding:'10px'}}>Cancelar</button>
        <button type="submit" disabled={salvando} style={{flex:1,padding:'10px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{salvando?'Salvando...':'Salvar'}</button>
      </div>
    </form>
  )

  return(
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:600,color:'var(--text)',flex:1}}>Estoque</span>
        <a href="/crm/estoque/importar" style={{padding:'8px 14px',fontSize:'13px',background:'var(--blue-bg)',color:'var(--blue-text)',border:'0.5px solid var(--blue-text)',borderRadius:'var(--radius)',cursor:'pointer',textDecoration:'none',fontWeight:500}}>
          📊 Importar planilha
        </a>
        <button onClick={()=>setModalNovo(true)} style={{padding:'8px 14px',fontSize:'13px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>+ Nova unidade</button>
      </div>

      {/* Abas */}
      <div style={{display:'flex',gap:'4px',background:'var(--bg-2)',padding:'3px',borderRadius:'var(--radius)',width:'fit-content'}}>
        {(['dashboard','lista'] as const).map(a=>(
          <button key={a} onClick={()=>setAbaView(a)} style={{fontSize:'13px',padding:'6px 16px',borderRadius:'var(--radius)',cursor:'pointer',border:'none',background:abaView===a?'var(--bg)':'transparent',color:abaView===a?'var(--text)':'var(--text-3)',fontWeight:abaView===a?500:400}}>
            {a==='dashboard'?'📊 Dashboard':'📋 Unidades'}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {abaView==='dashboard'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'8px'}}>
            {[
              {l:'Total de lotes',v:unidades.length,c:'var(--text)',big:false},
              {l:'Disponíveis',v:disp.length,c:'#1D9E75',big:false},
              {l:'Reservados',v:resv.length,c:'#BA7517',big:false},
              {l:'Vendidos',v:vend.length,c:'#E24B4A',big:false},
            ].map(s=>(
              <div key={s.l} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
                <div style={{fontSize:'24px',fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Valores */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px'}}>
            {[
              {l:'Valor em estoque (disponíveis)',v:moedaK(valorEstoque),c:'#1D9E75',bg:'var(--green-bg)'},
              {l:'Valor vendido',v:moedaK(valorVendido),c:'#E24B4A',bg:'var(--red-bg)'},
              {l:'Portfólio total',v:moedaK(valorTotal),c:'var(--text)',bg:'var(--bg-2)'},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,border:`0.5px solid ${s.c}44`,borderRadius:'var(--radius-lg)',padding:'14px'}}>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginBottom:'4px'}}>{s.l}</div>
                <div style={{fontSize:'20px',fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Por empreendimento */}
          {porEmp.length>0&&(
            <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'0.5px solid var(--border)',fontSize:'14px',fontWeight:500}}>Por empreendimento</div>
              {porEmp.map(e=>{
                const pctDisp=e.total>0?Math.round((e.disponiveis/e.total)*100):0
                const pctVend=e.total>0?Math.round((e.vendidos/e.total)*100):0
                return(
                  <div key={e.id} style={{padding:'12px 16px',borderBottom:'0.5px solid var(--border)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'14px',fontWeight:500,color:'var(--text)'}}>{e.slug}</div>
                        <div style={{fontSize:'12px',color:'var(--text-3)'}}>{e.nome}</div>
                      </div>
                      <div style={{display:'flex',gap:'10px',fontSize:'12px',flexShrink:0}}>
                        <span style={{color:'#1D9E75',fontWeight:600}}>{e.disponiveis} disp.</span>
                        <span style={{color:'#BA7517',fontWeight:600}}>{e.reservados} res.</span>
                        <span style={{color:'#E24B4A',fontWeight:600}}>{e.vendidos} vend.</span>
                        <span style={{color:'var(--teal)',fontWeight:600}}>{moedaK(e.valorDisp)}</span>
                      </div>
                    </div>
                    <div style={{height:'8px',background:'var(--bg-2)',borderRadius:'4px',overflow:'hidden',display:'flex'}}>
                      <div style={{height:'100%',width:`${pctVend}%`,background:'#E24B4A'}}></div>
                      <div style={{height:'100%',width:`${e.total>0?(e.reservados/e.total)*100:0}%`,background:'#BA7517'}}></div>
                      <div style={{height:'100%',width:`${pctDisp}%`,background:'#1D9E75'}}></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-3)',marginTop:'4px'}}>
                      <span>{e.total} lotes no total</span>
                      <span>{pctDisp}% disponíveis · {pctVend}% vendidos</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {unidades.length===0&&(
            <div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>
              <div style={{fontSize:'36px',marginBottom:'8px'}}>📦</div>
              <div style={{fontSize:'15px',marginBottom:'8px'}}>Nenhuma unidade cadastrada</div>
              <a href="/crm/estoque/importar" style={{color:'var(--teal)',textDecoration:'none',fontSize:'14px',fontWeight:500}}>← Importar planilha →</a>
            </div>
          )}
        </div>
      )}

      {/* LISTA */}
      {abaView==='lista'&&(
        <>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 14px'}}>
            <input type="text" placeholder="Buscar lote..." value={busca} onChange={e=>setBusca(e.target.value)} style={{flex:1,maxWidth:'180px'}}/>
            <select value={empFiltro} onChange={e=>setEmpFiltro(e.target.value)}>
              <option value="todos">Todos os empreendimentos</option>{emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
            </select>
            <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}>
              <option value="todos">Todos</option><option value="disponivel">Disponíveis</option><option value="reservado">Reservados</option><option value="vendido">Vendidos</option>
            </select>
            <span style={{fontSize:'12px',color:'var(--text-3)',alignSelf:'center'}}>{filtrados.length} unidades</span>
          </div>

          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px',minWidth:'700px'}}>
                <thead>
                  <tr style={{borderBottom:'0.5px solid var(--border)'}}>
                    {['Lote','Empreendimento','Área','Valor Total','Status','Ações'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:500,color:'var(--text-2)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u=>(
                    <tr key={u.id} style={{borderBottom:'0.5px solid var(--border)'}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                      <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text)'}}>{u.nome}</td>
                      <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{(u as any).empreendimento?.slug??'—'}</td>
                      <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{u.area_m2?`${u.area_m2} m²`:'—'}</td>
                      <td style={{padding:'10px 14px',fontWeight:500}}>{moeda(u.valor_total)}</td>
                      <td style={{padding:'10px 14px'}}>
                        <select value={u.status} onChange={e=>alterarStatus(u.id,e.target.value)} style={{fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:ST_BG[u.status],color:ST_COR[u.status],border:`0.5px solid ${ST_COR[u.status]}44`,cursor:'pointer',fontWeight:500}}>
                          <option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option>
                        </select>
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button onClick={()=>abrirSim(u)} style={{fontSize:'11px',padding:'4px 8px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>Simular</button>
                          <button onClick={()=>abrirEdit(u)} style={{fontSize:'11px',padding:'4px 8px',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent'}}>Editar</button>
                          <button onClick={()=>setModalExcluir(u)} style={{fontSize:'11px',padding:'4px 8px',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--red-text)'}}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtrados.length===0&&<div className="empty">Nenhuma unidade encontrada.</div>}
            </div>
          </div>
        </>
      )}

      {/* Modais */}
      {modalNovo&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}><div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'440px',overflow:'hidden'}}><div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:'14px',fontWeight:600}}>Nova unidade</span><button onClick={()=>setModalNovo(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'20px',lineHeight:1}}>✕</button></div>{formFields(false)}</div></div>)}
      {modalEdit&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}><div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'440px',overflow:'hidden'}}><div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:'14px',fontWeight:600}}>Editar — {modalEdit.nome}</span><button onClick={()=>setModalEdit(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'20px',lineHeight:1}}>✕</button></div>{formFields(true)}</div></div>)}
      {modalExcluir&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}><div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'380px',padding:'24px'}}><div style={{fontSize:'15px',fontWeight:600,marginBottom:'8px'}}>Excluir unidade?</div><p style={{fontSize:'13px',color:'var(--text-2)',marginBottom:'6px'}}>Excluir <strong>{modalExcluir.nome}</strong>.</p><p style={{fontSize:'12px',color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 10px',borderRadius:'var(--radius)',marginBottom:'16px'}}>⚠️ Esta ação não pode ser desfeita.</p><div style={{display:'flex',gap:'8px'}}><button onClick={()=>setModalExcluir(null)} style={{flex:1,padding:'10px'}}>Cancelar</button><button onClick={excluir} disabled={excluindo} style={{flex:1,padding:'10px',background:'var(--red-text)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{excluindo?'Excluindo...':'Excluir'}</button></div></div></div>)}

      {/* Modal Simulação */}
      {modalSim&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'540px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div><div style={{fontSize:'14px',fontWeight:600}}>Simulação</div><div style={{fontSize:'12px',color:'var(--text-2)'}}>{modalSim.nome} · {(modalSim as any).empreendimento?.nome??'—'}</div></div>
              <button onClick={()=>setModalSim(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'20px',lineHeight:1}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{background:'var(--teal-bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius-lg)',padding:'12px 16px'}}>
                <div style={{fontSize:'12px',color:'var(--teal-text)',opacity:.8}}>Valor total</div>
                <div style={{fontSize:'26px',fontWeight:700,color:'var(--teal-text)'}}>{moeda(vT)}</div>
                {modalSim.area_m2&&<div style={{fontSize:'12px',color:'var(--teal-text)',opacity:.7}}>{modalSim.area_m2} m² · {moeda(vT/modalSim.area_m2)}/m²</div>}
              </div>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'10px'}}>Opções</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {([['entrada_dividida','Entrada dividida'],['parcelas_intermediarias','Intermediárias'],['parcelas_semestrais','Semestrais'],['parcelas_anuais','Anuais']] as [keyof Opcoes,string][]).map(([k,l])=>(
                    <label key={k} style={{display:'flex',alignItems:'center',gap:'7px',cursor:'pointer',fontSize:'13px',padding:'9px',borderRadius:'var(--radius)',border:`0.5px solid ${opcoes[k]?'var(--teal)':'var(--border)'}`,background:opcoes[k]?'var(--teal-bg)':'var(--bg)'}}>
                      <input type="checkbox" checked={opcoes[k]} onChange={e=>setOpcoes(p=>({...p,[k]:e.target.checked}))} style={{width:'15px',height:'15px',accentColor:'var(--teal)',cursor:'pointer'}}/>
                      <span style={{color:opcoes[k]?'var(--teal-text)':'var(--text-2)',fontWeight:opcoes[k]?500:400}}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'8px'}}>Entrada</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>% do valor</label><input type="number" placeholder="ex: 20" value={sim.entrada_pct} onChange={e=>setSim(p=>({...p,entrada_pct:e.target.value,entrada_rs:''}))} /></div>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor R$</label><input type="number" placeholder="ex: 17000" value={sim.entrada_rs} onChange={e=>setSim(p=>({...p,entrada_rs:e.target.value,entrada_pct:''}))} /></div>
                </div>
                {eRS>0&&<div style={{marginTop:'5px',fontSize:'13px',color:'var(--text-2)'}}>Entrada: <strong>{moeda(eRS)}</strong> ({ePct.toFixed(1)}%)</div>}
              </div>
              {opcoes.entrada_dividida&&<div style={{background:'var(--bg-2)',padding:'10px 12px',borderRadius:'var(--radius)',borderLeft:'3px solid var(--teal)'}}><div style={{fontSize:'12px',fontWeight:500,marginBottom:'5px'}}>Dividir entrada em quantas parcelas?</div><input type="number" placeholder="ex: 3" value={sim.div_qtd} onChange={e=>setSim(p=>({...p,div_qtd:e.target.value}))} style={{maxWidth:'140px'}}/>{eDivP>0&&<div style={{marginTop:'4px',fontSize:'13px',color:'var(--teal-text)',fontWeight:500}}>{dQ}x de {moeda(eDivP)}</div>}</div>}
              {opcoes.parcelas_intermediarias&&<div style={{background:'var(--bg-2)',padding:'10px 12px',borderRadius:'var(--radius)',borderLeft:'3px solid #7F77DD'}}><div style={{fontSize:'12px',fontWeight:500,marginBottom:'6px'}}>Parcelas intermediárias</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Qtd</label><input type="number" value={sim.int_qtd} onChange={e=>setSim(p=>({...p,int_qtd:e.target.value}))} /></div><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor R$</label><input type="number" value={sim.int_val} onChange={e=>setSim(p=>({...p,int_val:e.target.value}))} /></div></div>{iQ>0&&iV>0&&<div style={{marginTop:'4px',fontSize:'12px',color:'#3C3489',fontWeight:500}}>{iQ}x de {moeda(iV)} = {moeda(iV*iQ)}</div>}</div>}
              {opcoes.parcelas_semestrais&&<div style={{background:'var(--bg-2)',padding:'10px 12px',borderRadius:'var(--radius)',borderLeft:'3px solid #EF9F27'}}><div style={{fontSize:'12px',fontWeight:500,marginBottom:'6px'}}>Parcelas semestrais</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Qtd</label><input type="number" value={sim.sem_qtd} onChange={e=>setSim(p=>({...p,sem_qtd:e.target.value}))} /></div><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor R$</label><input type="number" value={sim.sem_val} onChange={e=>setSim(p=>({...p,sem_val:e.target.value}))} /></div></div>{sQ>0&&sV>0&&<div style={{marginTop:'4px',fontSize:'12px',color:'#633806',fontWeight:500}}>{sQ}x de {moeda(sV)} = {moeda(sV*sQ)}</div>}</div>}
              {opcoes.parcelas_anuais&&<div style={{background:'var(--bg-2)',padding:'10px 12px',borderRadius:'var(--radius)',borderLeft:'3px solid #639922'}}><div style={{fontSize:'12px',fontWeight:500,marginBottom:'6px'}}>Parcelas anuais</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Qtd</label><input type="number" value={sim.anu_qtd} onChange={e=>setSim(p=>({...p,anu_qtd:e.target.value}))} /></div><div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor R$</label><input type="number" value={sim.anu_val} onChange={e=>setSim(p=>({...p,anu_val:e.target.value}))} /></div></div>{aQ>0&&aV>0&&<div style={{marginTop:'4px',fontSize:'12px',color:'#27500A',fontWeight:500}}>{aQ}x de {moeda(aV)} = {moeda(aV*aQ)}</div>}</div>}
              <div>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'7px'}}>Parcelas mensais</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <input type="number" placeholder="Quantidade de parcelas" value={sim.parcelas} onChange={e=>setSim(p=>({...p,parcelas:e.target.value}))} style={{maxWidth:'200px'}}/>
                  {pQ>0&&pV>0&&<span style={{fontSize:'13px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{pQ}x de <strong>{moeda(pV)}</strong></span>}
                </div>
              </div>
              {simOk&&(<div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px',border:'0.5px solid var(--border)'}}><div style={{fontSize:'13px',fontWeight:600,marginBottom:'10px'}}>RESUMO</div><div style={{display:'flex',flexDirection:'column',gap:'5px'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Valor do lote</span><span style={{fontWeight:500}}>{moeda(vT)}</span></div>{eRS>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>{opcoes.entrada_dividida&&dQ>0?`Entrada (${dQ}x de ${moeda(eDivP)})`:'Entrada'}</span><span style={{fontWeight:500,color:'var(--teal)'}}>{moeda(eRS)}</span></div>}{opcoes.parcelas_intermediarias&&iQ>0&&iV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Intermediárias</span><span style={{fontWeight:500}}>{moeda(iV*iQ)}</span></div>}{opcoes.parcelas_semestrais&&sQ>0&&sV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Semestrais</span><span style={{fontWeight:500}}>{moeda(sV*sQ)}</span></div>}{opcoes.parcelas_anuais&&aQ>0&&aV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Anuais</span><span style={{fontWeight:500}}>{moeda(aV*aQ)}</span></div>}{pQ>0&&pV>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',borderTop:'0.5px solid var(--border)',paddingTop:'8px',marginTop:'2px'}}><span>{pQ}x mensais de</span><span style={{fontWeight:700,color:'var(--teal)',fontSize:'20px'}}>{moeda(pV)}</span></div>}</div></div>)}
              {simOk&&<div><div style={{fontSize:'13px',fontWeight:500,marginBottom:'6px'}}>💬 Mensagem WhatsApp</div><textarea readOnly value={gerarMsg()} style={{width:'100%',minHeight:'130px',resize:'vertical',background:'var(--bg-2)',fontFamily:'monospace',lineHeight:1.6}}/></div>}
            </div>
            <div style={{padding:'14px 16px',borderTop:'2px solid var(--border)',background:'var(--bg)',display:'flex',gap:'10px',flexShrink:0,flexWrap:'wrap'}}>
              {simOk&&<button onClick={copiar} style={{flex:'1 1 120px',padding:'13px',fontSize:'14px',background:copiado?'#1D9E75':'var(--bg-2)',color:copiado?'#fff':'var(--text)',border:'1.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:600}}>{copiado?'✓ Copiado!':'📋 Copiar mensagem'}</button>}
              {!reservado?<button onClick={reservar} style={{flex:'1 1 120px',padding:'13px',fontSize:'14px',background:'#BA7517',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:600}}>🔒 Reservar lote</button>:<div style={{flex:'1 1 120px',padding:'13px',fontSize:'14px',background:'#FAEEDA',color:'#633806',borderRadius:'var(--radius)',fontWeight:600,textAlign:'center'}}>✓ Reservado</div>}
              <button onClick={()=>setModalSim(null)} style={{padding:'13px 20px',fontSize:'14px',border:'1.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',fontWeight:500}}>✕ Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
