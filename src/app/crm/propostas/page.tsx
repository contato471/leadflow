'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { PropostaExt as Proposta } from '@/types'

type Dados = Record<string,unknown> & {
  proponente?:string; empreendimento?:string; lote?:string; quadra?:string; area?:string
  cpf?:string; identidade?:string; profissao?:string; estado_civil?:string; cel1?:string; email?:string
  valor_proposta?:string; comissao?:string; valor_contrato?:string; sinal_proposta?:string
  saldo_financiar?:string; qtd_parcelas?:string; valor_parcela?:string
  primeiro_vencimento?:string; melhor_data?:string; observacoes?:string
  tem_segundo?:boolean; p2_nome?:string; p2_cel1?:string
}

function moedaFmt(v:string){ const n=parseFloat(v||'0'); return isNaN(n)?v:n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

export default function AdmPropostasPage() {
  const [pendentes, setPendentes] = useState<Proposta[]>([])
  const [historico, setHistorico] = useState<Proposta[]>([])
  const [aba, setAba] = useState<'pendentes'|'historico'>('pendentes')
  const [sel, setSel] = useState<Proposta|null>(null)
  const [marcando, setMarcando] = useState<string|null>(null)

  const carregar = useCallback(async () => {
    const [pRes, hRes] = await Promise.all([
      fetch('/api/propostas?feita=false').then(r=>r.json()),
      fetch('/api/propostas?feita=true').then(r=>r.json()),
    ])
    setPendentes(pRes.propostas ?? [])
    setHistorico(hRes.propostas ?? [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function marcarFeita(id: string) {
    setMarcando(id)
    await fetch(`/api/propostas/${id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ proposta_feita: true }),
    })
    setMarcando(null); await carregar()
    if (sel?.id === id) setSel(prev => prev ? {...prev, proposta_feita: true} : null)
  }

  const listaAtual = aba === 'pendentes' ? pendentes : historico

  const CardProposta = ({ p }: { p: Proposta }) => {
    const d = p.dados as unknown as Dados
    return (
      <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'14px 16px',cursor:'pointer'}} onClick={()=>setSel(p)}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--text)'}}>{d.proponente||'—'}</span>
              <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:p.proposta_feita?'#E1F5EE':'#FAEEDA',color:p.proposta_feita?'#085041':'#633806',fontWeight:500}}>
                {p.proposta_feita?'✓ Feita':'⏳ Pendente'}
              </span>
            </div>
            <div style={{fontSize:'12px',color:'var(--text-2)'}}>{d.empreendimento||'—'} · Lote {d.lote||'—'}</div>
            <div style={{fontSize:'11px',color:'var(--text-3)',marginTop:'2px'}}>
              #{p.id_amigavel} · {(p as any).corretor?.name||'—'} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          {d.valor_proposta && (
            <div style={{fontSize:'14px',fontWeight:600,color:'var(--teal)',flexShrink:0}}>{moedaFmt(d.valor_proposta)}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Lista */}
      <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'15px',fontWeight:600,color:'var(--text)',flex:1}}>Propostas</span>
          <div style={{display:'flex',gap:'4px',background:'var(--bg-2)',padding:'3px',borderRadius:'var(--radius)'}}>
            {(['pendentes','historico'] as const).map(a=>(
              <button key={a} onClick={()=>setAba(a)} style={{fontSize:'12px',padding:'5px 14px',borderRadius:'var(--radius)',cursor:'pointer',border:'none',background:aba===a?'var(--bg)':'transparent',color:aba===a?'var(--text)':'var(--text-3)',fontWeight:aba===a?500:400}}>
                {a==='pendentes'?`Pendentes (${pendentes.length})`:`Histórico (${historico.length})`}
              </button>
            ))}
          </div>
        </div>

        {listaAtual.length === 0
          ? <div style={{textAlign:'center',padding:'3rem',color:'var(--text-3)',fontSize:'13px'}}>{aba==='pendentes'?'Nenhuma proposta pendente. ✓':'Nenhuma proposta feita ainda.'}</div>
          : listaAtual.map(p => <CardProposta key={p.id} p={p}/>)
        }
      </div>

      {/* Painel de detalhes */}
      {sel && (() => {
        const d = sel.dados as unknown as Dados
        const fmt = (v?:string) => v ? moedaFmt(v) : '—'
        return (
          <div style={{width:'360px',flexShrink:0,borderLeft:'0.5px solid var(--border)',background:'var(--bg)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.proponente||'—'}</div>
                <div style={{fontSize:'11px',color:'var(--text-3)'}}>#{sel.id_amigavel} · {new Date(sel.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'16px',padding:'2px',flexShrink:0}}>✕</button>
            </div>

            <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* Empreendimento */}
              <div style={{background:'var(--teal-bg)',borderRadius:'var(--radius)',padding:'10px 12px'}}>
                <div style={{fontSize:'11px',fontWeight:600,color:'var(--teal-text)',marginBottom:'3px'}}>📍 Empreendimento</div>
                <div style={{fontSize:'12px',color:'var(--teal-text)'}}>{d.empreendimento||'—'}</div>
                <div style={{fontSize:'11px',color:'var(--teal-text)',opacity:.8}}>Lote {d.lote} · Quadra {d.quadra} · {d.area} m²</div>
              </div>

              {/* Proponente */}
              <div>
                <div style={{fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>👤 Proponente</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px'}}>
                  {[['Nome',d.proponente],['CPF',d.cpf],['Identidade',d.identidade],['Profissão',d.profissao],['Estado Civil',d.estado_civil],['Telefone',d.cel1],['E-mail',d.email]].map(([l,v])=>(
                    v ? <div key={l}><div style={{fontSize:'10px',color:'var(--text-3)'}}>{l}</div><div style={{fontSize:'12px',color:'var(--text)'}}>{v}</div></div> : null
                  ))}
                </div>
              </div>

              {d.tem_segundo && d.p2_nome && (
                <div>
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>👤 2º Proponente</div>
                  <div style={{fontSize:'12px',color:'var(--text)'}}>{d.p2_nome}</div>
                  <div style={{fontSize:'11px',color:'var(--text-3)'}}>{d.p2_cel1}</div>
                </div>
              )}

              {/* Valores */}
              <div style={{background:'var(--bg-2)',borderRadius:'var(--radius)',padding:'10px 12px'}}>
                <div style={{fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'8px'}}>💰 Pagamento</div>
                {[
                  ['Valor da proposta',fmt(d.valor_proposta)],
                  ['Comissão (5%)',fmt(d.comissao)],
                  ['Valor do contrato',fmt(d.valor_contrato)],
                  ['Sinal na proposta',fmt(d.sinal_proposta)],
                  ['Saldo a financiar',fmt(d.saldo_financiar)],
                  [`${d.qtd_parcelas}x de`,fmt(d.valor_parcela)],
                  ['Primeiro vencimento',d.primeiro_vencimento ? new Date(d.primeiro_vencimento).toLocaleDateString('pt-BR') : '—'],
                  ['Melhor data',`Dia ${d.melhor_data}`],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'11px',padding:'3px 0',borderBottom:'0.5px solid var(--border)'}}>
                    <span style={{color:'var(--text-3)'}}>{l}</span>
                    <span style={{fontWeight:500,color:'var(--text)'}}>{v}</span>
                  </div>
                ))}
                {d.observacoes && <div style={{marginTop:'6px',fontSize:'11px',color:'var(--text-2)',fontStyle:'italic',padding:'5px',background:'var(--bg)',borderRadius:'4px'}}>{d.observacoes}</div>}
              </div>

              {/* Corretor */}
              <div style={{fontSize:'11px',color:'var(--text-2)'}}>
                <span style={{fontWeight:500}}>Corretor: </span>{(sel as any).corretor?.name||'—'}
                {(sel as any).corretor?.phone && <> · {(sel as any).corretor.phone}</>}
              </div>

              {/* Documentos */}
              <div>
                <div style={{fontSize:'11px',fontWeight:600,color:'var(--text)',marginBottom:'8px'}}>📎 Documentos</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[['Identidade',sel.doc_identidade_url],['Comprovante residência',sel.doc_residencia_url]].map(([l,url])=>(
                    <div key={l}>
                      <div style={{fontSize:'10px',color:'var(--text-3)',marginBottom:'3px'}}>{l}</div>
                      {url
                        ? <div>
                            <img src={url as string} alt={l as string} style={{width:'100%',maxHeight:'120px',objectFit:'cover',borderRadius:'var(--radius)',border:'0.5px solid var(--border)',display:'block',marginBottom:'4px'}}/>
                            <a href={url as string} download={`${(l as string).replace(' ','_')}_${sel.id_amigavel}.jpg`} style={{fontSize:'11px',color:'var(--teal)',textDecoration:'none',display:'block',textAlign:'center',padding:'4px',border:'0.5px solid var(--teal)',borderRadius:'var(--radius)',background:'var(--teal-bg)'}}>⬇ Baixar foto</a>
                          </div>
                        : <div style={{height:'80px',border:'0.5px dashed var(--border)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'var(--text-3)'}}>Não anexado</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ação */}
            {!sel.proposta_feita && (
              <div style={{padding:'12px 14px',borderTop:'0.5px solid var(--border)',flexShrink:0}}>
                <button
                  onClick={()=>marcarFeita(sel.id)}
                  disabled={marcando===sel.id}
                  style={{width:'100%',padding:'10px',fontSize:'13px',background:'#1D9E75',color:'#fff',border:'none',borderRadius:'var(--radius)',cursor:'pointer',fontWeight:500}}
                >
                  {marcando===sel.id?'Processando...':'✓ Marcar como Proposta Feita'}
                </button>
              </div>
            )}
            {sel.proposta_feita && (
              <div style={{padding:'12px 14px',borderTop:'0.5px solid var(--border)',flexShrink:0}}>
                <div style={{textAlign:'center',fontSize:'12px',color:'#085041',background:'#E1F5EE',padding:'8px',borderRadius:'var(--radius)',fontWeight:500}}>
                  ✓ Proposta feita em {sel.feita_em ? new Date(sel.feita_em).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
