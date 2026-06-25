'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const ST_BG = { disponivel:'#E1F5EE', reservado:'#FAEEDA', vendido:'#FCEBEB' }
const ST_COR = { disponivel:'#1D9E75', reservado:'#BA7517', vendido:'#E24B4A' }
const ST_LABEL = { disponivel:'Disponível', reservado:'Reservado', vendido:'Vendido' }
function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

type Opcoes = { entrada_dividida:boolean; parcelas_intermediarias:boolean; parcelas_semestrais:boolean; parcelas_anuais:boolean }
type SimForm = { entrada_pct:string; entrada_rs:string; parcelas:string; parcelas_intermediarias_valor:string; parcelas_intermediarias_qtd:string; parcelas_semestrais_valor:string; parcelas_semestrais_qtd:string; parcelas_anuais_valor:string; parcelas_anuais_qtd:string; entrada_dividida_qtd:string }

export default function EstoqueAdmPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [empFiltro, setEmpFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEdit, setModalEdit] = useState<Unidade|null>(null)
  const [modalExcluir, setModalExcluir] = useState<Unidade|null>(null)
  const [modalSim, setModalSim] = useState<Unidade|null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [reservado, setReservado] = useState(false)
  const [form, setForm] = useState({empreendimento_id:'',nome:'',area_m2:'',valor_total:'',status:'disponivel',observacao:''})
  const [opcoes, setOpcoes] = useState<Opcoes>({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false})
  const [sim, setSim] = useState<SimForm>({entrada_pct:'',entrada_rs:'',parcelas:'',parcelas_intermediarias_valor:'',parcelas_intermediarias_qtd:'',parcelas_semestrais_valor:'',parcelas_semestrais_qtd:'',parcelas_anuais_valor:'',parcelas_anuais_qtd:'',entrada_dividida_qtd:''})

  const carregar = useCallback(async () => {
    const p = new URLSearchParams()
    if (empFiltro !== 'todos') p.set('empreendimento_id', empFiltro)
    if (statusFiltro !== 'todos') p.set('status', statusFiltro)
    const d = await fetch(`/api/unidades?${p}`).then(r=>r.json())
    setUnidades(d.unidades ?? [])
  }, [empFiltro, statusFiltro])

  useEffect(() => { fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[])) }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarNovo(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true)
    await fetch('/api/unidades', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,area_m2:form.area_m2?parseFloat(form.area_m2):null,valor_total:parseFloat(form.valor_total)}) })
    setSalvando(false); setModalNovo(false); setForm({empreendimento_id:'',nome:'',area_m2:'',valor_total:'',status:'disponivel',observacao:''}); carregar()
  }

  async function salvarEdit(e: React.FormEvent) {
    e.preventDefault(); if (!modalEdit) return; setSalvando(true)
    await fetch(`/api/unidades/${modalEdit.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,area_m2:form.area_m2?parseFloat(form.area_m2):null,valor_total:parseFloat(form.valor_total)}) })
    setSalvando(false); setModalEdit(null); carregar()
  }

  async function excluir() {
    if (!modalExcluir) return; setExcluindo(true)
    await fetch(`/api/unidades/${modalExcluir.id}`, { method:'DELETE' })
    setExcluindo(false); setModalExcluir(null); carregar()
  }

  async function alterarStatus(id:string, status:string) {
    await fetch(`/api/unidades/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }); carregar()
  }

  function abrirEdit(u:Unidade) {
    setModalEdit(u); setForm({empreendimento_id:u.empreendimento_id,nome:u.nome,area_m2:u.area_m2?String(u.area_m2):'',valor_total:String(u.valor_total),status:u.status,observacao:u.observacao??''})
  }

  function abrirSim(u:Unidade) {
    setModalSim(u); setReservado(false); setCopiado(false)
    setOpcoes({entrada_dividida:false,parcelas_intermediarias:false,parcelas_semestrais:false,parcelas_anuais:false})
    setSim({entrada_pct:'',entrada_rs:'',parcelas:'',parcelas_intermediarias_valor:'',parcelas_intermediarias_qtd:'',parcelas_semestrais_valor:'',parcelas_semestrais_qtd:'',parcelas_anuais_valor:'',parcelas_anuais_qtd:'',entrada_dividida_qtd:''})
  }

  const valorTotal = modalSim?.valor_total ?? 0
  const entradaRS = sim.entrada_rs ? parseFloat(sim.entrada_rs) : sim.entrada_pct ? (valorTotal*parseFloat(sim.entrada_pct)/100) : 0
  const entradaPct = valorTotal > 0 ? ((entradaRS/valorTotal)*100) : 0
  const divQtd = parseInt(sim.entrada_dividida_qtd)||0
  const entradaDivParcela = divQtd > 0 && entradaRS > 0 ? entradaRS/divQtd : 0
  const intVal=parseFloat(sim.parcelas_intermediarias_valor)||0; const intQtd=parseInt(sim.parcelas_intermediarias_qtd)||0
  const semVal=parseFloat(sim.parcelas_semestrais_valor)||0; const semQtd=parseInt(sim.parcelas_semestrais_qtd)||0
  const anuVal=parseFloat(sim.parcelas_anuais_valor)||0; const anuQtd=parseInt(sim.parcelas_anuais_qtd)||0
  const totalAdicionais=(intVal*intQtd)+(semVal*semQtd)+(anuVal*anuQtd)
  const restante=Math.max(valorTotal-entradaRS-totalAdicionais,0)
  const parcelasQtd=parseInt(sim.parcelas)||0
  const valorParcela=parcelasQtd>0&&restante>0?restante/parcelasQtd:0
  const simValida=entradaRS>0||parcelasQtd>0

  function gerarMensagem():string {
    if(!modalSim)return''
    const emp=(modalSim as any).empreendimento
    const l:string[]=[]
    l.push('🏡 *SIMULAÇÃO DE PAGAMENTO*'); l.push('')
    l.push(`📍 *${emp?.nome??modalSim.nome}*`)
    l.push(`🔹 Lote: ${modalSim.nome}`)
    if(modalSim.area_m2)l.push(`📐 Área: ${modalSim.area_m2} m²`)
    l.push(`💰 Valor total: *${moeda(valorTotal)}*`); l.push(''); l.push('━━━━━━━━━━━━━━━━━'); l.push('')
    if(opcoes.entrada_dividida&&divQtd>0&&entradaRS>0){l.push('✅ *Entrada dividida:*');l.push(`   ${divQtd}x de ${moeda(entradaDivParcela)} = ${moeda(entradaRS)} (${entradaPct.toFixed(1)}%)`)}
    else if(entradaRS>0){l.push(`✅ *Entrada:* ${moeda(entradaRS)} (${entradaPct.toFixed(1)}%)`)}
    if(opcoes.parcelas_intermediarias&&intQtd>0&&intVal>0){l.push(`📅 *Parcelas intermediárias:*`);l.push(`   ${intQtd}x de ${moeda(intVal)} = ${moeda(intVal*intQtd)}`)}
    if(opcoes.parcelas_semestrais&&semQtd>0&&semVal>0){l.push(`📆 *Parcelas semestrais:*`);l.push(`   ${semQtd}x de ${moeda(semVal)} = ${moeda(semVal*semQtd)}`)}
    if(opcoes.parcelas_anuais&&anuQtd>0&&anuVal>0){l.push(`🗓️ *Parcelas anuais:*`);l.push(`   ${anuQtd}x de ${moeda(anuVal)} = ${moeda(anuVal*anuQtd)}`)}
    if(parcelasQtd>0&&valorParcela>0){l.push(`💳 *Saldo parcelado:*`);l.push(`   ${parcelasQtd}x de *${moeda(valorParcela)}*`)}
    l.push(''); l.push('━━━━━━━━━━━━━━━━━'); l.push(''); l.push('📊 *Resumo:*')
    l.push(`• Valor total: ${moeda(valorTotal)}`)
    if(entradaRS>0)l.push(`• Entrada: ${moeda(entradaRS)}`)
    if(totalAdicionais>0)l.push(`• Outros pagamentos: ${moeda(totalAdicionais)}`)
    if(parcelasQtd>0)l.push(`• Saldo: ${parcelasQtd}x de ${moeda(valorParcela)}`)
    l.push(''); l.push('Qualquer dúvida, estou à disposição! 😊'); l.push('_Prime Empreendimentos_')
    return l.join('\n')
  }

  async function copiar(){await navigator.clipboard.writeText(gerarMensagem());setCopiado(true);setTimeout(()=>setCopiado(false),3000)}
  async function reservar(){if(!modalSim)return;await fetch(`/api/unidades/${modalSim.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'reservado'})});setReservado(true);carregar()}

  const filtrados = unidades.filter(u => !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || (u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase()))
  const formFields = (isEdit=false) => (
    <form onSubmit={isEdit?salvarEdit:salvarNovo} style={{padding:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
      <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Empreendimento *</label>
        <select required value={form.empreendimento_id} onChange={e=>setForm(p=>({...p,empreendimento_id:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
          <option value="">Selecione...</option>{emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select></div>
      <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Nome / Número do lote *</label><input required value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="ex: Lote 15, Quadra A"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Área (m²)</label><input type="number" value={form.area_m2} onChange={e=>setForm(p=>({...p,area_m2:e.target.value}))} placeholder="ex: 250"/></div>
        <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor total (R$) *</label><input required type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))} placeholder="ex: 85000"/></div>
      </div>
      <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Status</label>
        <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{width:'100%',fontSize:'12px'}}>
          <option value="disponivel">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option>
        </select></div>
      <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Observação</label><textarea value={form.observacao} onChange={e=>setForm(p=>({...p,observacao:e.target.value}))} style={{width:'100%',fontSize:'12px',minHeight:'50px',resize:'vertical'}}/></div>
      <div style={{display:'flex',gap:'8px',paddingTop:'4px'}}>
        <button type="button" onClick={()=>isEdit?setModalEdit(null):setModalNovo(false)} style={{flex:1,padding:'8px',fontSize:'13px'}}>Cancelar</button>
        <button type="submit" disabled={salvando} style={{flex:1,padding:'8px',fontSize:'13px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{salvando?'Salvando...':'Salvar'}</button>
      </div>
    </form>
  )

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <span style={{fontSize:'15px',fontWeight:600,color:'var(--text)',flex:1}}>Estoque de Unidades</span>
        <button onClick={()=>setModalNovo(true)} style={{fontSize:'13px',padding:'7px 16px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>+ Nova unidade</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'8px'}}>
        {[{l:'Total',v:unidades.length,c:'var(--text)'},{l:'Disponíveis',v:unidades.filter(u=>u.status==='disponivel').length,c:'#1D9E75'},{l:'Reservados',v:unidades.filter(u=>u.status==='reservado').length,c:'#BA7517'},{l:'Vendidos',v:unidades.filter(u=>u.status==='vendido').length,c:'#E24B4A'}].map(s=>(
          <div key={s.l} style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px'}}>
            <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'3px'}}>{s.l}</div>
            <div style={{fontSize:'22px',fontWeight:500,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 14px'}}>
        <input type="text" placeholder="Buscar lote..." value={busca} onChange={e=>setBusca(e.target.value)} style={{fontSize:'12px',maxWidth:'180px',flex:1}}/>
        <select value={empFiltro} onChange={e=>setEmpFiltro(e.target.value)} style={{fontSize:'12px',padding:'5px 8px'}}>
          <option value="todos">Todos os empreendimentos</option>{emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)} style={{fontSize:'12px',padding:'5px 8px'}}>
          <option value="todos">Todos os status</option><option value="disponivel">Disponíveis</option><option value="reservado">Reservados</option><option value="vendido">Vendidos</option>
        </select>
        <span style={{fontSize:'12px',color:'var(--text-3)',alignSelf:'center'}}>{filtrados.length} unidades</span>
      </div>

      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
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
                      <button onClick={()=>abrirSim(u)} style={{fontSize:'11px',padding:'4px 10px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer'}}>Simular</button>
                      <button onClick={()=>abrirEdit(u)} style={{fontSize:'11px',padding:'4px 10px',border:'0.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--text-2)'}}>Editar</button>
                      <button onClick={()=>setModalExcluir(u)} style={{fontSize:'11px',padding:'4px 10px',border:'0.5px solid var(--red-text)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--red-text)'}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'13px'}}>Nenhuma unidade encontrada.</div>}
        </div>
      </div>

      {/* Modal Nova Unidade */}
      {modalNovo&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'440px',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>Nova unidade</span>
              <button onClick={()=>setModalNovo(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'18px'}}>✕</button>
            </div>
            {formFields(false)}
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEdit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'440px',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>Editar unidade — {modalEdit.nome}</span>
              <button onClick={()=>setModalEdit(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'18px'}}>✕</button>
            </div>
            {formFields(true)}
          </div>
        </div>
      )}

      {/* Modal Excluir Unidade */}
      {modalExcluir&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'380px',padding:'24px'}}>
            <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)',marginBottom:'8px'}}>Excluir unidade?</div>
            <p style={{fontSize:'13px',color:'var(--text-2)',marginBottom:'6px'}}>Excluir <strong>{modalExcluir.nome}</strong> ({(modalExcluir as any).empreendimento?.slug}).</p>
            <p style={{fontSize:'12px',color:'var(--red-text)',background:'var(--red-bg)',padding:'8px 10px',borderRadius:'var(--radius)',marginBottom:'16px'}}>⚠️ Esta ação não pode ser desfeita.</p>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>setModalExcluir(null)} style={{flex:1,padding:'9px',fontSize:'13px'}}>Cancelar</button>
              <button onClick={excluir} disabled={excluindo} style={{flex:1,padding:'9px',fontSize:'13px',background:'var(--red-text)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>{excluindo?'Excluindo...':'Excluir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simulação */}
      {modalSim&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'540px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div><div style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>Simulação de pagamento</div><div style={{fontSize:'12px',color:'var(--text-2)',marginTop:'2px'}}>{modalSim.nome} · {(modalSim as any).empreendimento?.nome??'—'}</div></div>
              <button onClick={()=>setModalSim(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'20px',lineHeight:1}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{background:'var(--teal-bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius-lg)',padding:'12px 16px'}}>
                <div style={{fontSize:'11px',color:'var(--teal-text)',opacity:.8}}>Valor total do lote</div>
                <div style={{fontSize:'26px',fontWeight:700,color:'var(--teal-text)'}}>{moeda(valorTotal)}</div>
              </div>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'12px 14px'}}>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'10px'}}>Opções do plano</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {([['entrada_dividida','Entrada dividida'],['parcelas_intermediarias','Parcelas intermediárias'],['parcelas_semestrais','Parcelas semestrais'],['parcelas_anuais','Parcelas anuais']] as [keyof Opcoes,string][]).map(([key,label])=>(
                    <label key={key} style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',padding:'8px 10px',borderRadius:'var(--radius)',border:`0.5px solid ${opcoes[key]?'var(--teal)':'var(--border)'}`,background:opcoes[key]?'var(--teal-bg)':'var(--bg)'}}>
                      <input type="checkbox" checked={opcoes[key]} onChange={e=>setOpcoes(p=>({...p,[key]:e.target.checked}))} style={{width:'15px',height:'15px',accentColor:'var(--teal)',cursor:'pointer'}}/>
                      <span style={{fontWeight:opcoes[key]?500:400,color:opcoes[key]?'var(--teal-text)':'var(--text-2)',fontSize:'12px'}}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>{opcoes.entrada_dividida?'Valor total da entrada':'Entrada'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Percentual (%)</label><input type="number" placeholder="ex: 20" value={sim.entrada_pct} onChange={e=>setSim(p=>({...p,entrada_pct:e.target.value,entrada_rs:''}))} style={{fontSize:'12px'}}/></div>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor (R$)</label><input type="number" placeholder="ex: 17000" value={sim.entrada_rs} onChange={e=>setSim(p=>({...p,entrada_rs:e.target.value,entrada_pct:''}))} style={{fontSize:'12px'}}/></div>
                </div>
                {entradaRS>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'var(--text-2)'}}>Entrada: <strong>{moeda(entradaRS)}</strong> ({entradaPct.toFixed(1)}%)</div>}
              </div>
              {opcoes.entrada_dividida&&(<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px',borderLeft:'3px solid var(--teal)'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Dividir entrada em quantas parcelas?</div>
                <input type="number" placeholder="ex: 3" value={sim.entrada_dividida_qtd} onChange={e=>setSim(p=>({...p,entrada_dividida_qtd:e.target.value}))} style={{fontSize:'12px',maxWidth:'140px'}}/>
                {entradaDivParcela>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'var(--teal-text)',fontWeight:500}}>{divQtd}x de {moeda(entradaDivParcela)}</div>}
              </div>)}
              {opcoes.parcelas_intermediarias&&(<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px',borderLeft:'3px solid #7F77DD'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Parcelas intermediárias</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Quantidade</label><input type="number" placeholder="ex: 4" value={sim.parcelas_intermediarias_qtd} onChange={e=>setSim(p=>({...p,parcelas_intermediarias_qtd:e.target.value}))} style={{fontSize:'12px'}}/></div>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor cada (R$)</label><input type="number" placeholder="ex: 5000" value={sim.parcelas_intermediarias_valor} onChange={e=>setSim(p=>({...p,parcelas_intermediarias_valor:e.target.value}))} style={{fontSize:'12px'}}/></div>
                </div>
                {intQtd>0&&intVal>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'#3C3489',fontWeight:500}}>{intQtd}x de {moeda(intVal)} = {moeda(intVal*intQtd)}</div>}
              </div>)}
              {opcoes.parcelas_semestrais&&(<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px',borderLeft:'3px solid #EF9F27'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Parcelas semestrais</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Quantidade</label><input type="number" placeholder="ex: 2" value={sim.parcelas_semestrais_qtd} onChange={e=>setSim(p=>({...p,parcelas_semestrais_qtd:e.target.value}))} style={{fontSize:'12px'}}/></div>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor cada (R$)</label><input type="number" placeholder="ex: 8000" value={sim.parcelas_semestrais_valor} onChange={e=>setSim(p=>({...p,parcelas_semestrais_valor:e.target.value}))} style={{fontSize:'12px'}}/></div>
                </div>
                {semQtd>0&&semVal>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'#633806',fontWeight:500}}>{semQtd}x de {moeda(semVal)} = {moeda(semVal*semQtd)}</div>}
              </div>)}
              {opcoes.parcelas_anuais&&(<div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px',borderLeft:'3px solid #639922'}}>
                <div style={{fontSize:'11px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Parcelas anuais</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Quantidade</label><input type="number" placeholder="ex: 3" value={sim.parcelas_anuais_qtd} onChange={e=>setSim(p=>({...p,parcelas_anuais_qtd:e.target.value}))} style={{fontSize:'12px'}}/></div>
                  <div><label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor cada (R$)</label><input type="number" placeholder="ex: 12000" value={sim.parcelas_anuais_valor} onChange={e=>setSim(p=>({...p,parcelas_anuais_valor:e.target.value}))} style={{fontSize:'12px'}}/></div>
                </div>
                {anuQtd>0&&anuVal>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'#27500A',fontWeight:500}}>{anuQtd}x de {moeda(anuVal)} = {moeda(anuVal*anuQtd)}</div>}
              </div>)}
              <div>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Parcelas mensais (saldo restante)</div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <input type="number" placeholder="Quantidade de parcelas" value={sim.parcelas} onChange={e=>setSim(p=>({...p,parcelas:e.target.value}))} style={{fontSize:'12px',maxWidth:'200px'}}/>
                  {parcelasQtd>0&&restante>0&&<span style={{fontSize:'12px',color:'var(--text-2)'}}>{parcelasQtd}x de <strong>{moeda(valorParcela)}</strong></span>}
                </div>
              </div>
              {simValida&&(
                <div style={{background:'var(--bg-2)',borderRadius:'var(--radius-lg)',padding:'14px 16px',border:'0.5px solid var(--border)'}}>
                  <div style={{fontSize:'12px',fontWeight:600,color:'var(--text)',marginBottom:'10px'}}>RESUMO</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Valor do lote</span><span style={{fontWeight:500}}>{moeda(valorTotal)}</span></div>
                    {entradaRS>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>{opcoes.entrada_dividida&&divQtd>0?`Entrada (${divQtd}x de ${moeda(entradaDivParcela)})`:'Entrada'}</span><span style={{fontWeight:500,color:'var(--teal)'}}>{moeda(entradaRS)}</span></div>}
                    {opcoes.parcelas_intermediarias&&intQtd>0&&intVal>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Intermediárias ({intQtd}x)</span><span style={{fontWeight:500}}>{moeda(intVal*intQtd)}</span></div>}
                    {opcoes.parcelas_semestrais&&semQtd>0&&semVal>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Semestrais ({semQtd}x)</span><span style={{fontWeight:500}}>{moeda(semVal*semQtd)}</span></div>}
                    {opcoes.parcelas_anuais&&anuQtd>0&&anuVal>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}><span style={{color:'var(--text-2)'}}>Anuais ({anuQtd}x)</span><span style={{fontWeight:500}}>{moeda(anuVal*anuQtd)}</span></div>}
                    {parcelasQtd>0&&valorParcela>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',borderTop:'0.5px solid var(--border)',paddingTop:'8px',marginTop:'2px'}}><span style={{color:'var(--text)'}}>{parcelasQtd}x mensais de</span><span style={{fontWeight:700,color:'var(--teal)',fontSize:'18px'}}>{moeda(valorParcela)}</span></div>}
                  </div>
                </div>
              )}
              {simValida&&(<div><div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>💬 Mensagem pronta para WhatsApp</div><textarea readOnly value={gerarMensagem()} style={{width:'100%',fontSize:'11px',minHeight:'140px',resize:'vertical',background:'var(--bg-2)',fontFamily:'monospace',lineHeight:1.6}}/></div>)}
            </div>
            <div style={{padding:'14px 16px',borderTop:'2px solid var(--border)',background:'var(--bg)',display:'flex',gap:'10px',flexShrink:0,flexWrap:'wrap'}}>
              {simValida&&<button onClick={copiar} style={{flex:'1 1 120px',padding:'14px',fontSize:'14px',background:copiado?'#1D9E75':'var(--bg-2)',color:copiado?'#fff':'var(--text)',border:'1.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:600}}>{copiado?'✓ Copiado!':'📋 Copiar mensagem'}</button>}
              {!reservado?<button onClick={reservar} style={{flex:'1 1 120px',padding:'14px',fontSize:'14px',background:'#BA7517',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:600}}>🔒 Reservar lote</button>:<div style={{flex:'1 1 120px',padding:'14px',fontSize:'14px',background:'#FAEEDA',color:'#633806',borderRadius:'var(--radius)',fontWeight:600,textAlign:'center'}}>✓ Lote reservado</div>}
              <button onClick={()=>setModalSim(null)} style={{padding:'14px 20px',fontSize:'14px',border:'1.5px solid var(--border-2)',borderRadius:'var(--radius)',cursor:'pointer',background:'transparent',color:'var(--text-2)',fontWeight:500}}>✕ Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
