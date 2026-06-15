'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Unidade, Empreendimento } from '@/types'

const ST_BG = { disponivel:'#E1F5EE', reservado:'#FAEEDA', vendido:'#FCEBEB' }
const ST_COR = { disponivel:'#1D9E75', reservado:'#BA7517', vendido:'#E24B4A' }
const ST_LABEL = { disponivel:'Disponível', reservado:'Reservado', vendido:'Vendido' }
function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

export default function CorretorEstoquePage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [empFiltro, setEmpFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Unidade|null>(null)
  const [orc, setOrc] = useState({ entrada_pct:'', entrada_rs:'', parcelas:'12' })

  const carregar = useCallback(async () => {
    const p = new URLSearchParams({ status:'disponivel' })
    if (empFiltro !== 'todos') p.set('empreendimento_id', empFiltro)
    const d = await fetch(`/api/unidades?${p}`).then(r=>r.json())
    setUnidades(d.unidades ?? [])
  }, [empFiltro])

  useEffect(() => { fetch('/api/empreendimentos').then(r=>r.json()).then(d=>setEmps(d.empreendimentos??[])) }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtrados = unidades.filter(u => !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || (u as any).empreendimento?.nome?.toLowerCase().includes(busca.toLowerCase()))

  const valorTotal = sel?.valor_total ?? 0
  const entradaRS = orc.entrada_rs ? parseFloat(orc.entrada_rs) : orc.entrada_pct ? (valorTotal*parseFloat(orc.entrada_pct)/100) : 0
  const entradaPct = valorTotal > 0 ? ((entradaRS/valorTotal)*100).toFixed(1) : '0'
  const restante = Math.max(valorTotal-entradaRS, 0)
  const parcelas = parseInt(orc.parcelas)||1
  const valorParcela = restante/parcelas

  return (
    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <span style={{fontSize:'15px',fontWeight:600,color:'var(--text)',flex:1}}>Unidades Disponíveis</span>
        <span style={{fontSize:'12px',color:'var(--text-3)'}}>{filtrados.length} unidades</span>
      </div>

      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'10px 14px'}}>
        <input type="text" placeholder="Buscar lote ou loteamento..." value={busca} onChange={e=>setBusca(e.target.value)} style={{fontSize:'12px',maxWidth:'220px',flex:1}}/>
        <select value={empFiltro} onChange={e=>setEmpFiltro(e.target.value)} style={{fontSize:'12px',padding:'5px 8px'}}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
      </div>

      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{borderBottom:'0.5px solid var(--border)'}}>
                {['Lote','Empreendimento','Área (m²)','Valor Total','Status','Ação'].map(h=>(
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
                  <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{(u as any).empreendimento?.nome??'—'}</td>
                  <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{u.area_m2?`${u.area_m2} m²`:'—'}</td>
                  <td style={{padding:'10px 14px',fontWeight:500,color:'var(--text)'}}>{moeda(u.valor_total)}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:ST_BG[u.status],color:ST_COR[u.status],fontWeight:500}}>
                      {ST_LABEL[u.status]}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <button onClick={()=>{setSel(u);setOrc({entrada_pct:'',entrada_rs:'',parcelas:'12'})}} style={{fontSize:'11px',padding:'5px 12px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>
                      Simular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'13px'}}>Nenhuma unidade disponível.</div>}
        </div>
      </div>

      {/* Modal Simulação */}
      {sel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'}}>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:'420px',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>Simulação de pagamento</div>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginTop:'2px'}}>{sel.nome} · {(sel as any).empreendimento?.slug}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'18px'}}>✕</button>
            </div>
            <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
                <div style={{fontSize:'11px',color:'var(--text-2)',marginBottom:'4px'}}>Valor total do lote</div>
                <div style={{fontSize:'24px',fontWeight:700,color:'var(--teal)'}}>{moeda(valorTotal)}</div>
                {sel.area_m2&&<div style={{fontSize:'11px',color:'var(--text-3)',marginTop:'2px'}}>{sel.area_m2} m² · {moeda(valorTotal/sel.area_m2)}/m²</div>}
              </div>

              <div>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>Entrada</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Percentual (%)</label>
                    <input type="number" placeholder="ex: 20" value={orc.entrada_pct} onChange={e=>setOrc(p=>({...p,entrada_pct:e.target.value,entrada_rs:''}))} style={{fontSize:'12px'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',color:'var(--text-2)',display:'block',marginBottom:'3px'}}>Valor (R$)</label>
                    <input type="number" placeholder="ex: 17000" value={orc.entrada_rs} onChange={e=>setOrc(p=>({...p,entrada_rs:e.target.value,entrada_pct:''}))} style={{fontSize:'12px'}}/>
                  </div>
                </div>
                {entradaRS>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'var(--text-2)'}}>Entrada: <strong>{moeda(entradaRS)}</strong> ({entradaPct}%)</div>}
              </div>

              <div>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',marginBottom:'7px'}}>Parcelas</div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                  {['12','24','36','48','60','72','84','96','120'].map(p=>(
                    <button key={p} onClick={()=>setOrc(prev=>({...prev,parcelas:p}))} style={{fontSize:'12px',padding:'5px 10px',borderRadius:'20px',cursor:'pointer',border:'0.5px solid var(--border-2)',background:orc.parcelas===p?'var(--teal)':'transparent',color:orc.parcelas===p?'#fff':'var(--text-2)',fontWeight:orc.parcelas===p?500:400}}>
                      {p}x
                    </button>
                  ))}
                </div>
              </div>

              <div style={{background:'var(--teal-bg)',border:'0.5px solid var(--teal)',borderRadius:'var(--radius-lg)',padding:'14px 16px'}}>
                <div style={{fontSize:'11px',color:'var(--teal-text)',marginBottom:'10px',fontWeight:600}}>RESUMO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  {[['Valor do lote',moeda(valorTotal)],['Entrada',moeda(entradaRS)],['Saldo',moeda(restante)],[`${parcelas}x de`,moeda(valorParcela)]].map(([l,v],i)=>(
                    <div key={l}><div style={{fontSize:'10px',color:'var(--teal-text)',opacity:.7}}>{l}</div><div style={{fontSize:i===3?'20px':'14px',fontWeight:i===3?700:500,color:'var(--teal-text)'}}>{v}</div></div>
                  ))}
                </div>
              </div>

              <button onClick={()=>setSel(null)} style={{width:'100%',padding:'10px',fontSize:'13px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
