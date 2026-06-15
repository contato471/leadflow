'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const ST_BG = { disponivel:'#E1F5EE', reservado:'#FAEEDA', vendido:'#FCEBEB' }
const ST_COR = { disponivel:'#1D9E75', reservado:'#BA7517', vendido:'#E24B4A' }
const ST_LABEL = { disponivel:'Disponível', reservado:'Reservado', vendido:'Vendido' }

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Opcoes = {
  entrada_dividida: boolean
  parcelas_intermediarias: boolean
  parcelas_semestrais: boolean
  parcelas_anuais: boolean
}

type SimForm = {
  entrada_pct: string
  entrada_rs: string
  parcelas: string
  parcelas_intermediarias_valor: string
  parcelas_intermediarias_qtd: string
  parcelas_semestrais_valor: string
  parcelas_semestrais_qtd: string
  parcelas_anuais_valor: string
  parcelas_anuais_qtd: string
  entrada_dividida_qtd: string
}

export default function CorretorEstoquePage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [empFiltro, setEmpFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Unidade | null>(null)
  const [reservando, setReservando] = useState(false)
  const [reservado, setReservado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [opcoes, setOpcoes] = useState<Opcoes>({
    entrada_dividida: false,
    parcelas_intermediarias: false,
    parcelas_semestrais: false,
    parcelas_anuais: false,
  })
  const [sim, setSim] = useState<SimForm>({
    entrada_pct: '', entrada_rs: '', parcelas: '',
    parcelas_intermediarias_valor: '', parcelas_intermediarias_qtd: '',
    parcelas_semestrais_valor: '', parcelas_semestrais_qtd: '',
    parcelas_anuais_valor: '', parcelas_anuais_qtd: '',
    entrada_dividida_qtd: '',
  })
  const [nomeCorretor, setNomeCorretor] = useState('')

  const carregar = useCallback(async () => {
    const p = new URLSearchParams({ status: 'disponivel' })
    if (empFiltro !== 'todos') p.set('empreendimento_id', empFiltro)
    const d = await fetch(`/api/unidades?${p}`).then(r => r.json())
    setUnidades(d.unidades ?? [])
  }, [empFiltro])

  useEffect(() => {
    fetch('/api/empreendimentos').then(r => r.json()).then(d => setEmps(d.empreendimentos ?? []))
    fetch('/api/perfil').then(r => r.json()).then(d => setNomeCorretor(d.user?.name ?? ''))
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtrados = unidades.filter(u =>
    !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  function abrirSim(u: Unidade) {
    setSel(u)
    setReservado(false)
    setCopiado(false)
    setOpcoes({ entrada_dividida:false, parcelas_intermediarias:false, parcelas_semestrais:false, parcelas_anuais:false })
    setSim({ entrada_pct:'', entrada_rs:'', parcelas:'', parcelas_intermediarias_valor:'', parcelas_intermediarias_qtd:'', parcelas_semestrais_valor:'', parcelas_semestrais_qtd:'', parcelas_anuais_valor:'', parcelas_anuais_qtd:'', entrada_dividida_qtd:'' })
  }

  // Cálculos principais
  const valorTotal = sel?.valor_total ?? 0
  const entradaRS = sim.entrada_rs
    ? parseFloat(sim.entrada_rs)
    : sim.entrada_pct
      ? (valorTotal * parseFloat(sim.entrada_pct) / 100)
      : 0
  const entradaPct = valorTotal > 0 ? ((entradaRS / valorTotal) * 100) : 0
  const parcelasQtd = parseInt(sim.parcelas) || 0

  // Parcelas adicionais
  const intVal = parseFloat(sim.parcelas_intermediarias_valor) || 0
  const intQtd = parseInt(sim.parcelas_intermediarias_qtd) || 0
  const semVal = parseFloat(sim.parcelas_semestrais_valor) || 0
  const semQtd = parseInt(sim.parcelas_semestrais_qtd) || 0
  const anuVal = parseFloat(sim.parcelas_anuais_valor) || 0
  const anuQtd = parseInt(sim.parcelas_anuais_qtd) || 0
  const divQtd = parseInt(sim.entrada_dividida_qtd) || 0

  const totalAdicionais = (intVal * intQtd) + (semVal * semQtd) + (anuVal * anuQtd)
  const entradaDivParcela = (divQtd > 0 && entradaRS > 0) ? (entradaRS / divQtd) : 0
  const restante = Math.max(valorTotal - entradaRS - totalAdicionais, 0)
  const valorParcela = (parcelasQtd > 0 && restante > 0) ? (restante / parcelasQtd) : 0

  // Mensagem para WhatsApp
  function gerarMensagem(): string {
    if (!sel) return ''
    const emp = (sel as any).empreendimento
    const linhas: string[] = []
    linhas.push(`🏡 *SIMULAÇÃO DE PAGAMENTO*`)
    linhas.push(``)
    linhas.push(`📍 *${emp?.nome ?? sel.nome}*`)
    linhas.push(`🔹 Lote: ${sel.nome}`)
    if (sel.area_m2) linhas.push(`📐 Área: ${sel.area_m2} m²`)
    linhas.push(`💰 Valor total: *${moeda(valorTotal)}*`)
    linhas.push(``)
    linhas.push(`━━━━━━━━━━━━━━━━━`)
    linhas.push(``)

    if (opcoes.entrada_dividida && divQtd > 0 && entradaRS > 0) {
      linhas.push(`✅ *Entrada dividida:*`)
      linhas.push(`   ${divQtd}x de ${moeda(entradaDivParcela)} = ${moeda(entradaRS)} (${entradaPct.toFixed(1)}%)`)
    } else if (entradaRS > 0) {
      linhas.push(`✅ *Entrada:* ${moeda(entradaRS)} (${entradaPct.toFixed(1)}%)`)
    }

    if (opcoes.parcelas_intermediarias && intQtd > 0 && intVal > 0) {
      linhas.push(`📅 *Parcelas intermediárias:*`)
      linhas.push(`   ${intQtd}x de ${moeda(intVal)} = ${moeda(intVal * intQtd)}`)
    }
    if (opcoes.parcelas_semestrais && semQtd > 0 && semVal > 0) {
      linhas.push(`📆 *Parcelas semestrais:*`)
      linhas.push(`   ${semQtd}x de ${moeda(semVal)} = ${moeda(semVal * semQtd)}`)
    }
    if (opcoes.parcelas_anuais && anuQtd > 0 && anuVal > 0) {
      linhas.push(`🗓️ *Parcelas anuais:*`)
      linhas.push(`   ${anuQtd}x de ${moeda(anuVal)} = ${moeda(anuVal * anuQtd)}`)
    }

    if (parcelasQtd > 0 && valorParcela > 0) {
      linhas.push(`💳 *Saldo parcelado:*`)
      linhas.push(`   ${parcelasQtd}x de *${moeda(valorParcela)}*`)
    }

    linhas.push(``)
    linhas.push(`━━━━━━━━━━━━━━━━━`)
    linhas.push(``)
    linhas.push(`📊 *Resumo:*`)
    linhas.push(`• Valor total: ${moeda(valorTotal)}`)
    if (entradaRS > 0) linhas.push(`• Entrada: ${moeda(entradaRS)}`)
    if (totalAdicionais > 0) linhas.push(`• Outros pagamentos: ${moeda(totalAdicionais)}`)
    if (parcelasQtd > 0) linhas.push(`• Saldo: ${parcelasQtd}x de ${moeda(valorParcela)}`)
    linhas.push(``)
    linhas.push(`Qualquer dúvida, estou à disposição! 😊`)
    if (nomeCorretor) linhas.push(`_${nomeCorretor} - Prime Empreendimentos_`)
    return linhas.join('\n')
  }

  async function copiarMensagem() {
    await navigator.clipboard.writeText(gerarMensagem())
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  async function reservarLote() {
    if (!sel) return
    setReservando(true)
    await fetch(`/api/unidades/${sel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reservado' }),
    })
    setReservando(false)
    setReservado(true)
    setSel(prev => prev ? { ...prev, status: 'reservado' } : null)
    carregar()
  }

  const msgPronta = gerarMensagem()
  const simValida = entradaRS > 0 || parcelasQtd > 0

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'15px', fontWeight:600, color:'var(--text)', flex:1 }}>Unidades Disponíveis</span>
        <span style={{ fontSize:'12px', color:'var(--text-3)' }}>{filtrados.length} unidades</span>
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 14px' }}>
        <input type="text" placeholder="Buscar lote ou loteamento..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ fontSize:'12px', maxWidth:'220px', flex:1 }}/>
        <select value={empFiltro} onChange={e=>setEmpFiltro(e.target.value)} style={{ fontSize:'12px', padding:'5px 8px' }}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
      </div>

      <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                {['Lote','Empreendimento','Área','Valor Total','Status','Ação'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:500, color:'var(--text-2)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u=>(
                <tr key={u.id} style={{ borderBottom:'0.5px solid var(--border)' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--bg-2)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                  <td style={{ padding:'10px 14px', fontWeight:500, color:'var(--text)' }}>{u.nome}</td>
                  <td style={{ padding:'10px 14px', color:'var(--text-2)' }}>{(u as any).empreendimento?.nome ?? '—'}</td>
                  <td style={{ padding:'10px 14px', color:'var(--text-2)' }}>{u.area_m2 ? `${u.area_m2} m²` : '—'}</td>
                  <td style={{ padding:'10px 14px', fontWeight:500, color:'var(--text)' }}>{moeda(u.valor_total)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:ST_BG[u.status], color:ST_COR[u.status], fontWeight:500 }}>{ST_LABEL[u.status]}</span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={()=>abrirSim(u)} style={{ fontSize:'11px', padding:'5px 14px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>
                      Simular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length===0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:'13px' }}>Nenhuma unidade disponível.</div>}
        </div>
      </div>

      {/* Modal de Simulação */}
      {sel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'16px' }}>
          <div style={{ background:'var(--bg)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:'560px', maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text)' }}>Simulação de pagamento</div>
                <div style={{ fontSize:'12px', color:'var(--text-2)', marginTop:'2px' }}>
                  {sel.nome} · {(sel as any).empreendimento?.nome ?? '—'}{sel.area_m2 ? ` · ${sel.area_m2} m²` : ''}
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:'20px', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Valor do lote */}
              <div style={{ background:'var(--teal-bg)', border:'0.5px solid var(--teal)', borderRadius:'var(--radius-lg)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'var(--teal-text)', opacity:.8 }}>Valor total do lote</div>
                  <div style={{ fontSize:'26px', fontWeight:700, color:'var(--teal-text)' }}>{moeda(valorTotal)}</div>
                </div>
                {reservado ? (
                  <span style={{ fontSize:'12px', padding:'5px 12px', borderRadius:'20px', background:'#FAEEDA', color:'#633806', fontWeight:500 }}>✓ Reservado</span>
                ) : (
                  <span style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', background:'#E1F5EE', color:'#085041', fontWeight:500 }}>Disponível</span>
                )}
              </div>

              {/* Checkboxes de opções */}
              <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius-lg)', padding:'12px 14px' }}>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', marginBottom:'10px' }}>Opções do plano de pagamento</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {([
                    ['entrada_dividida', 'Entrada dividida'],
                    ['parcelas_intermediarias', 'Parcelas intermediárias'],
                    ['parcelas_semestrais', 'Parcelas semestrais'],
                    ['parcelas_anuais', 'Parcelas anuais'],
                  ] as [keyof Opcoes, string][]).map(([key, label]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'var(--text-2)', padding:'8px 10px', borderRadius:'var(--radius)', border:`0.5px solid ${opcoes[key]?'var(--teal)':'var(--border)'}`, background:opcoes[key]?'var(--teal-bg)':'var(--bg)' }}>
                      <input type="checkbox" checked={opcoes[key]} onChange={e=>setOpcoes(p=>({...p,[key]:e.target.checked}))} style={{ width:'15px', height:'15px', accentColor:'var(--teal)', cursor:'pointer' }}/>
                      <span style={{ fontWeight:opcoes[key]?500:400, color:opcoes[key]?'var(--teal-text)':'var(--text-2)' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Entrada */}
              <div>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>
                  {opcoes.entrada_dividida ? 'Valor total da entrada (será dividida)' : 'Entrada'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <div>
                    <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Percentual (%)</label>
                    <input type="number" placeholder="ex: 20" value={sim.entrada_pct}
                      onChange={e=>setSim(p=>({...p,entrada_pct:e.target.value,entrada_rs:''}))}
                      style={{ fontSize:'12px' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor (R$)</label>
                    <input type="number" placeholder="ex: 17000" value={sim.entrada_rs}
                      onChange={e=>setSim(p=>({...p,entrada_rs:e.target.value,entrada_pct:''}))}
                      style={{ fontSize:'12px' }}/>
                  </div>
                </div>
                {entradaRS > 0 && (
                  <div style={{ marginTop:'5px', fontSize:'12px', color:'var(--text-2)' }}>
                    Entrada: <strong>{moeda(entradaRS)}</strong> ({entradaPct.toFixed(1)}% do valor total)
                  </div>
                )}
              </div>

              {/* Entrada dividida */}
              {opcoes.entrada_dividida && (
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'10px 12px', borderLeft:'3px solid var(--teal)' }}>
                  <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Dividir entrada em quantas parcelas?</div>
                  <input type="number" placeholder="ex: 3" value={sim.entrada_dividida_qtd}
                    onChange={e=>setSim(p=>({...p,entrada_dividida_qtd:e.target.value}))}
                    style={{ fontSize:'12px', maxWidth:'140px' }}/>
                  {entradaDivParcela > 0 && (
                    <div style={{ marginTop:'6px', fontSize:'12px', color:'var(--teal-text)', fontWeight:500 }}>
                      {divQtd}x de {moeda(entradaDivParcela)}
                    </div>
                  )}
                </div>
              )}

              {/* Parcelas intermediárias */}
              {opcoes.parcelas_intermediarias && (
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'10px 12px', borderLeft:'3px solid #7F77DD' }}>
                  <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Parcelas intermediárias</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Quantidade</label>
                      <input type="number" placeholder="ex: 4" value={sim.parcelas_intermediarias_qtd} onChange={e=>setSim(p=>({...p,parcelas_intermediarias_qtd:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor cada (R$)</label>
                      <input type="number" placeholder="ex: 5000" value={sim.parcelas_intermediarias_valor} onChange={e=>setSim(p=>({...p,parcelas_intermediarias_valor:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                  </div>
                  {intQtd > 0 && intVal > 0 && <div style={{ marginTop:'6px', fontSize:'12px', color:'#3C3489', fontWeight:500 }}>{intQtd}x de {moeda(intVal)} = {moeda(intVal*intQtd)}</div>}
                </div>
              )}

              {/* Parcelas semestrais */}
              {opcoes.parcelas_semestrais && (
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'10px 12px', borderLeft:'3px solid #EF9F27' }}>
                  <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Parcelas semestrais</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Quantidade</label>
                      <input type="number" placeholder="ex: 2" value={sim.parcelas_semestrais_qtd} onChange={e=>setSim(p=>({...p,parcelas_semestrais_qtd:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor cada (R$)</label>
                      <input type="number" placeholder="ex: 8000" value={sim.parcelas_semestrais_valor} onChange={e=>setSim(p=>({...p,parcelas_semestrais_valor:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                  </div>
                  {semQtd > 0 && semVal > 0 && <div style={{ marginTop:'6px', fontSize:'12px', color:'#633806', fontWeight:500 }}>{semQtd}x de {moeda(semVal)} = {moeda(semVal*semQtd)}</div>}
                </div>
              )}

              {/* Parcelas anuais */}
              {opcoes.parcelas_anuais && (
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'10px 12px', borderLeft:'3px solid #639922' }}>
                  <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Parcelas anuais</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Quantidade</label>
                      <input type="number" placeholder="ex: 3" value={sim.parcelas_anuais_qtd} onChange={e=>setSim(p=>({...p,parcelas_anuais_qtd:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                    <div><label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor cada (R$)</label>
                      <input type="number" placeholder="ex: 12000" value={sim.parcelas_anuais_valor} onChange={e=>setSim(p=>({...p,parcelas_anuais_valor:e.target.value}))} style={{ fontSize:'12px' }}/></div>
                  </div>
                  {anuQtd > 0 && anuVal > 0 && <div style={{ marginTop:'6px', fontSize:'12px', color:'#27500A', fontWeight:500 }}>{anuQtd}x de {moeda(anuVal)} = {moeda(anuVal*anuQtd)}</div>}
                </div>
              )}

              {/* Parcelas mensais */}
              <div>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>Parcelas mensais (saldo restante)</div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input type="number" placeholder="Quantidade de parcelas" value={sim.parcelas}
                    onChange={e=>setSim(p=>({...p,parcelas:e.target.value}))}
                    style={{ fontSize:'12px', maxWidth:'220px' }}/>
                  {parcelasQtd > 0 && restante > 0 && (
                    <span style={{ fontSize:'12px', color:'var(--text-2)' }}>{parcelasQtd}x de <strong>{moeda(valorParcela)}</strong></span>
                  )}
                </div>
              </div>

              {/* Resumo */}
              {simValida && (
                <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius-lg)', padding:'14px 16px', border:'0.5px solid var(--border)' }}>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)', marginBottom:'10px' }}>RESUMO DO PLANO</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                      <span style={{ color:'var(--text-2)' }}>Valor do lote</span>
                      <span style={{ fontWeight:500 }}>{moeda(valorTotal)}</span>
                    </div>
                    {entradaRS > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                        <span style={{ color:'var(--text-2)' }}>{opcoes.entrada_dividida && divQtd > 0 ? `Entrada (${divQtd}x de ${moeda(entradaDivParcela)})` : 'Entrada'}</span>
                        <span style={{ fontWeight:500, color:'var(--teal)' }}>{moeda(entradaRS)}</span>
                      </div>
                    )}
                    {opcoes.parcelas_intermediarias && intQtd > 0 && intVal > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                        <span style={{ color:'var(--text-2)' }}>Intermediárias ({intQtd}x)</span>
                        <span style={{ fontWeight:500 }}>{moeda(intVal*intQtd)}</span>
                      </div>
                    )}
                    {opcoes.parcelas_semestrais && semQtd > 0 && semVal > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                        <span style={{ color:'var(--text-2)' }}>Semestrais ({semQtd}x)</span>
                        <span style={{ fontWeight:500 }}>{moeda(semVal*semQtd)}</span>
                      </div>
                    )}
                    {opcoes.parcelas_anuais && anuQtd > 0 && anuVal > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                        <span style={{ color:'var(--text-2)' }}>Anuais ({anuQtd}x)</span>
                        <span style={{ fontWeight:500 }}>{moeda(anuVal*anuQtd)}</span>
                      </div>
                    )}
                    {parcelasQtd > 0 && valorParcela > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', borderTop:'0.5px solid var(--border)', paddingTop:'8px', marginTop:'2px' }}>
                        <span style={{ color:'var(--text)' }}>{parcelasQtd}x mensais de</span>
                        <span style={{ fontWeight:700, color:'var(--teal)', fontSize:'18px' }}>{moeda(valorParcela)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem pronta */}
              {simValida && (
                <div>
                  <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', marginBottom:'6px' }}>💬 Mensagem pronta para WhatsApp</div>
                  <textarea readOnly value={msgPronta} style={{ width:'100%', fontSize:'11px', minHeight:'160px', resize:'vertical', background:'var(--bg-2)', fontFamily:'monospace', lineHeight:1.6 }}/>
                </div>
              )}
            </div>

            {/* Footer com ações */}
            <div style={{ padding:'12px 16px', borderTop:'0.5px solid var(--border)', background:'var(--bg-2)', display:'flex', gap:'8px', flexShrink:0 }}>
              {simValida && (
                <button onClick={copiarMensagem} style={{ flex:1, padding:'10px', fontSize:'13px', background: copiado ? '#1D9E75' : 'var(--bg)', color: copiado ? '#fff' : 'var(--text)', border:'0.5px solid var(--border-2)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>
                  {copiado ? '✓ Copiado!' : '📋 Copiar mensagem'}
                </button>
              )}
              {!reservado ? (
                <button onClick={reservarLote} disabled={reservando} style={{ flex:1, padding:'10px', fontSize:'13px', background:'#BA7517', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500, opacity:reservando?.7:1 }}>
                  {reservando ? 'Reservando...' : '🔒 Reservar lote'}
                </button>
              ) : (
                <div style={{ flex:1, padding:'10px', fontSize:'13px', background:'#FAEEDA', color:'#633806', borderRadius:'var(--radius)', fontWeight:500, textAlign:'center' }}>
                  ✓ Lote reservado
                </div>
              )}
              <button onClick={()=>setSel(null)} style={{ padding:'10px 16px', fontSize:'13px', border:'0.5px solid var(--border-2)', borderRadius:'var(--radius)', cursor:'pointer', background:'transparent', color:'var(--text-2)' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
