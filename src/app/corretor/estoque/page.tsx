'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const STATUS_LABEL = { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' }
const STATUS_COR = { disponivel: '#1D9E75', reservado: '#BA7517', vendido: '#E24B4A' }
const STATUS_BG = { disponivel: '#E1F5EE', reservado: '#FAEEDA', vendido: '#FCEBEB' }

function moeda(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export default function EstoquePage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [empFiltro, setEmpFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<'novo'|'orcamento'|null>(null)
  const [sel, setSel] = useState<Unidade|null>(null)
  const [form, setForm] = useState({ empreendimento_id:'', nome:'', area_m2:'', valor_total:'', status:'disponivel', observacao:'' })
  const [orc, setOrc] = useState({ entrada_pct:'', entrada_rs:'', parcelas:'12' })
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    const p = new URLSearchParams()
    if (empFiltro !== 'todos') p.set('empreendimento_id', empFiltro)
    if (statusFiltro !== 'todos') p.set('status', statusFiltro)
    const d = await fetch(`/api/unidades?${p}`).then(r => r.json())
    setUnidades(d.unidades ?? [])
    setLoading(false)
  }, [empFiltro, statusFiltro])

  useEffect(() => {
    fetch('/api/empreendimentos').then(r => r.json()).then(d => setEmps(d.empreendimentos ?? []))
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarUnidade(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/unidades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, area_m2: form.area_m2 ? parseFloat(form.area_m2) : null, valor_total: parseFloat(form.valor_total) }),
    })
    setModal(null); setForm({ empreendimento_id:'', nome:'', area_m2:'', valor_total:'', status:'disponivel', observacao:'' })
    carregar()
  }

  async function alterarStatus(id: string, status: string) {
    await fetch(`/api/unidades/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    carregar()
  }

  function abrirOrcamento(u: Unidade) {
    setSel(u); setOrc({ entrada_pct:'', entrada_rs:'', parcelas:'12' }); setModal('orcamento')
  }

  // Cálculo do orçamento
  const valorTotal = sel?.valor_total ?? 0
  const entradaRS = orc.entrada_rs ? parseFloat(orc.entrada_rs) : orc.entrada_pct ? (valorTotal * parseFloat(orc.entrada_pct) / 100) : 0
  const entradaPct = valorTotal > 0 ? ((entradaRS / valorTotal) * 100).toFixed(1) : '0'
  const restante = Math.max(valorTotal - entradaRS, 0)
  const parcelas = parseInt(orc.parcelas) || 1
  const valorParcela = restante / parcelas

  const filtrados = unidades.filter(u => {
    const buscaOk = !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || (u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase())
    return buscaOk
  })

  const disponiveis = unidades.filter(u => u.status === 'disponivel').length
  const reservados = unidades.filter(u => u.status === 'reservado').length
  const vendidos = unidades.filter(u => u.status === 'vendido').length

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'15px', fontWeight:600, color:'var(--text)', flex:1 }}>Estoque de Unidades</span>
        <button onClick={() => setModal('novo')} style={{ fontSize:'13px', padding:'7px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>
          + Nova unidade
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'8px' }}>
        {[
          { l:'Total', v:unidades.length, c:'var(--text)' },
          { l:'Disponíveis', v:disponiveis, c:'#1D9E75' },
          { l:'Reservados', v:reservados, c:'#BA7517' },
          { l:'Vendidos', v:vendidos, c:'#E24B4A' },
        ].map(s => (
          <div key={s.l} style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
            <div style={{ fontSize:'11px', color:'var(--text-2)', marginBottom:'3px' }}>{s.l}</div>
            <div style={{ fontSize:'22px', fontWeight:500, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'10px 14px' }}>
        <input type="text" placeholder="Buscar unidade..." value={busca} onChange={e => setBusca(e.target.value)} style={{ fontSize:'12px', maxWidth:'200px', flex:1 }} />
        <select value={empFiltro} onChange={e => setEmpFiltro(e.target.value)} style={{ fontSize:'12px', padding:'5px 8px' }}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e => <option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={{ fontSize:'12px', padding:'5px 8px' }}>
          <option value="todos">Todos os status</option>
          <option value="disponivel">Disponíveis</option>
          <option value="reservado">Reservados</option>
          <option value="vendido">Vendidos</option>
        </select>
        <span style={{ fontSize:'12px', color:'var(--text-3)', alignSelf:'center' }}>{filtrados.length} unidades</span>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)' }}>Carregando...</div>
      ) : (
        <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                  {['Unidade','Empreendimento','Área (m²)','Valor Total','Status','Ações'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:500, color:'var(--text-2)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id} style={{ borderBottom:'0.5px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding:'10px 14px', fontWeight:500, color:'var(--text)' }}>{u.nome}</td>
                    <td style={{ padding:'10px 14px', color:'var(--text-2)' }}>{(u as any).empreendimento?.slug ?? '—'}</td>
                    <td style={{ padding:'10px 14px', color:'var(--text-2)' }}>{u.area_m2 ? `${u.area_m2} m²` : '—'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:500, color:'var(--text)' }}>{moeda(u.valor_total)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <select
                        value={u.status}
                        onChange={e => alterarStatus(u.id, e.target.value)}
                        style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'20px', background:STATUS_BG[u.status], color:STATUS_COR[u.status], border:`0.5px solid ${STATUS_COR[u.status]}44`, cursor:'pointer', fontWeight:500 }}
                      >
                        <option value="disponivel">Disponível</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                      </select>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <button onClick={() => abrirOrcamento(u)} style={{ fontSize:'11px', padding:'4px 10px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer' }}>
                        Orçamento
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:'13px' }}>Nenhuma unidade encontrada.</div>}
          </div>
        </div>
      )}

      {/* Modal Nova Unidade */}
      {modal === 'novo' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'16px' }}>
          <div style={{ background:'var(--bg)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:'440px', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'14px', fontWeight:600, color:'var(--text)' }}>Nova unidade</span>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:'18px' }}>✕</button>
            </div>
            <form onSubmit={salvarUnidade} style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Empreendimento *</label>
                <select required value={form.empreendimento_id} onChange={e => setForm(p => ({...p, empreendimento_id:e.target.value}))} style={{ width:'100%', fontSize:'12px' }}>
                  <option value="">Selecione...</option>
                  {emps.map(e => <option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Nome / Número do lote *</label>
                <input required value={form.nome} onChange={e => setForm(p => ({...p, nome:e.target.value}))} placeholder="ex: Lote 15, Quadra A" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Área (m²)</label>
                  <input type="number" value={form.area_m2} onChange={e => setForm(p => ({...p, area_m2:e.target.value}))} placeholder="ex: 250" />
                </div>
                <div>
                  <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor total (R$) *</label>
                  <input required type="number" value={form.valor_total} onChange={e => setForm(p => ({...p, valor_total:e.target.value}))} placeholder="ex: 85000" />
                </div>
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status:e.target.value}))} style={{ width:'100%', fontSize:'12px' }}>
                  <option value="disponivel">Disponível</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({...p, observacao:e.target.value}))} style={{ width:'100%', fontSize:'12px', minHeight:'50px', resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:'8px', paddingTop:'4px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex:1, padding:'8px', fontSize:'13px' }}>Cancelar</button>
                <button type="submit" style={{ flex:1, padding:'8px', fontSize:'13px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Orçamento */}
      {modal === 'orcamento' && sel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'16px' }}>
          <div style={{ background:'var(--bg)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:'420px', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text)' }}>Orçamento</div>
                <div style={{ fontSize:'12px', color:'var(--text-2)', marginTop:'2px' }}>{sel.nome} · {(sel as any).empreendimento?.slug}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:'18px' }}>✕</button>
            </div>
            <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* Valor do lote */}
              <div style={{ background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                <div style={{ fontSize:'11px', color:'var(--text-2)', marginBottom:'4px' }}>Valor total do lote</div>
                <div style={{ fontSize:'22px', fontWeight:600, color:'var(--teal)' }}>{moeda(valorTotal)}</div>
                {sel.area_m2 && <div style={{ fontSize:'11px', color:'var(--text-3)', marginTop:'2px' }}>{sel.area_m2} m² · {moeda(valorTotal / sel.area_m2)}/m²</div>}
              </div>

              {/* Entrada */}
              <div>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', marginBottom:'8px' }}>Entrada</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <div>
                    <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Percentual (%)</label>
                    <input
                      type="number" placeholder="ex: 20" value={orc.entrada_pct}
                      onChange={e => { setOrc(p => ({...p, entrada_pct:e.target.value, entrada_rs:''})) }}
                      style={{ fontSize:'12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Valor (R$)</label>
                    <input
                      type="number" placeholder="ex: 17000" value={orc.entrada_rs}
                      onChange={e => { setOrc(p => ({...p, entrada_rs:e.target.value, entrada_pct:''})) }}
                      style={{ fontSize:'12px' }}
                    />
                  </div>
                </div>
                {entradaRS > 0 && (
                  <div style={{ marginTop:'6px', fontSize:'12px', color:'var(--text-2)' }}>
                    Entrada: <strong>{moeda(entradaRS)}</strong> ({entradaPct}% do valor total)
                  </div>
                )}
              </div>

              {/* Parcelas */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:500, color:'var(--text)', display:'block', marginBottom:'6px' }}>Número de parcelas</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {['12','24','36','48','60','72','84','96','120'].map(p => (
                    <button key={p} onClick={() => setOrc(prev => ({...prev, parcelas:p}))}
                      style={{ fontSize:'12px', padding:'5px 10px', borderRadius:'20px', cursor:'pointer', border:'0.5px solid var(--border-2)', background:orc.parcelas===p?'var(--teal)':'transparent', color:orc.parcelas===p?'#fff':'var(--text-2)', fontWeight:orc.parcelas===p?500:400 }}>
                      {p}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado */}
              <div style={{ background:'var(--teal-bg)', border:'0.5px solid var(--teal)', borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
                <div style={{ fontSize:'11px', color:'var(--teal-text)', marginBottom:'8px', fontWeight:500 }}>RESUMO DO ORÇAMENTO</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'var(--teal-text)', opacity:.7 }}>Valor do lote</div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'var(--teal-text)' }}>{moeda(valorTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'var(--teal-text)', opacity:.7 }}>Entrada ({entradaPct}%)</div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'var(--teal-text)' }}>{moeda(entradaRS)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'var(--teal-text)', opacity:.7 }}>Saldo restante</div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'var(--teal-text)' }}>{moeda(restante)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', color:'var(--teal-text)', opacity:.7 }}>{parcelas}x de</div>
                    <div style={{ fontSize:'18px', fontWeight:700, color:'var(--teal-text)' }}>{moeda(valorParcela)}</div>
                  </div>
                </div>
              </div>

              <button onClick={() => setModal(null)} style={{ width:'100%', padding:'10px', fontSize:'13px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
