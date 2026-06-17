'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { FUNIL_ETAPAS, type Cliente, type FunilEtapa, type ClienteTimeline } from '@/types'

function ini(n:string){return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
const AVC=['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C']
function av(n:string){const[bg,tx]=AVC[n.charCodeAt(0)%AVC.length].split(':');return{bg,tx}}
function fone(t:string){return t.replace(/(\d{2})(\d{4,5})(\d{4})/,'($1) $2-$3')}
function moeda(v:number){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

const ETAPAS_LEAD: FunilEtapa[] = ['lead_novo','atendimento','visita_agendada','visita_realizada','proposta','follow_up','sem_resposta']
const ETAPAS_CLIENTE: FunilEtapa[] = ['venda_feita','sucesso_cliente','desistente']

export default function CorretorClientesPage() {
  const [todos, setTodos] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<'leads'|'clientes'>('leads')
  const [sel, setSel] = useState<Cliente|null>(null)
  const [tl, setTl] = useState<ClienteTimeline[]>([])
  const [nota, setNota] = useState('')
  const [novaEtapa, setNovaEtapa] = useState<FunilEtapa|''>('')
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string|null>(null)
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const d = await fetch(`/api/clientes?corretor_id=${user.id}&limit=500`).then(r=>r.json())
    setTodos(d.clientes ?? [])
  }, [supabase])

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

  async function deletarNota(tlId: string) {
    setDeletando(tlId)
    await fetch(`/api/clientes/timeline/${tlId}`, { method:'DELETE' })
    const d = await fetch(`/api/clientes/${sel!.id}`).then(r=>r.json())
    setTl(d.timeline ?? [])
    setDeletando(null)
  }

  const eLabel = (e:string) => FUNIL_ETAPAS.find(f=>f.value===e)?.label ?? e
  const eCor = (e:string) => FUNIL_ETAPAS.find(f=>f.value===e)?.cor ?? '#888'

  const filtrados = todos.filter(c => {
    const etapasOk = aba === 'leads' ? ETAPAS_LEAD.includes(c.etapa) : ETAPAS_CLIENTE.includes(c.etapa)
    const buscaOk = !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca)
    return etapasOk && buscaOk
  })

  const leads = todos.filter(c => ETAPAS_LEAD.includes(c.etapa))
  const clientes = todos.filter(c => ETAPAS_CLIENTE.includes(c.etapa))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'8px 14px', borderBottom:'0.5px solid var(--border)', background:'var(--bg)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:'6px', marginBottom:'8px' }}>
          <button onClick={() => setAba('leads')} style={{ flex:1, padding:'8px', fontSize:'13px', borderRadius:'var(--radius)', cursor:'pointer', border:`0.5px solid ${aba==='leads'?'var(--teal)':'var(--border)'}`, background:aba==='leads'?'var(--teal-bg)':'transparent', color:aba==='leads'?'var(--teal-text)':'var(--text-2)', fontWeight:aba==='leads'?600:400 }}>
            ⚡ Leads em atendimento ({leads.length})
          </button>
          <button onClick={() => setAba('clientes')} style={{ flex:1, padding:'8px', fontSize:'13px', borderRadius:'var(--radius)', cursor:'pointer', border:`0.5px solid ${aba==='clientes'?'var(--teal)':'var(--border)'}`, background:aba==='clientes'?'var(--teal-bg)':'transparent', color:aba==='clientes'?'var(--teal-text)':'var(--text-2)', fontWeight:aba==='clientes'?600:400 }}>
            ✓ Meus clientes ({clientes.length})
          </button>
        </div>
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..." style={{ width:'100%', fontSize:'14px' }}/>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Lista */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtrados.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)', fontSize:'14px' }}>
              {aba === 'leads' ? 'Nenhum lead em atendimento.' : 'Nenhum cliente fechado ainda.'}
            </div>
          )}

          {aba === 'leads' && filtrados.map(c => {
            const cor = av(c.nome); const ec = eCor(c.etapa); const isS = sel?.id === c.id
            return (
              <div key={c.id} onClick={() => abrir(c)} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:'0.5px solid var(--border)', cursor:'pointer', background:isS?'var(--bg-2)':'transparent', transition:'background .1s' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:cor.bg, color:cor.tx, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:500, flexShrink:0 }}>{ini(c.nome)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{c.nome}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-2)', marginTop:'2px' }}>{fone(c.telefone)}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-3)', marginTop:'1px' }}>{(c as any).empreendimento?.slug ?? '—'}</div>
                </div>
                <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'20px', background:ec+'22', color:ec, fontWeight:500, flexShrink:0, whiteSpace:'nowrap' }}>{eLabel(c.etapa)}</span>
              </div>
            )
          })}

          {aba === 'clientes' && filtrados.map(c => {
            const cor = av(c.nome); const isS = sel?.id === c.id
            // Tenta pegar dados da proposta via simulação salva
            const d = c as any
            return (
              <div key={c.id} onClick={() => abrir(c)} style={{ padding:'12px 14px', borderBottom:'0.5px solid var(--border)', cursor:'pointer', background:isS?'var(--bg-2)':'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:cor.bg, color:cor.tx, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:500, flexShrink:0 }}>{ini(c.nome)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text)' }}>{c.nome}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-2)' }}>{fone(c.telefone)}</div>
                  </div>
                  <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'20px', background:'#E1F5EE', color:'#085041', fontWeight:500, flexShrink:0 }}>✓ Cliente</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginLeft:'48px' }}>
                  {d.empreendimento && <div><div style={{ fontSize:'10px', color:'var(--text-3)' }}>Empreendimento</div><div style={{ fontSize:'12px', color:'var(--text)' }}>{d.empreendimento.slug} — {d.empreendimento.nome}</div></div>}
                  {c.email && <div><div style={{ fontSize:'10px', color:'var(--text-3)' }}>E-mail</div><div style={{ fontSize:'12px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</div></div>}
                  {c.interesse && <div><div style={{ fontSize:'10px', color:'var(--text-3)' }}>Interesse</div><div style={{ fontSize:'12px', color:'var(--text)' }}>{c.interesse}</div></div>}
                  {c.unidade_interesse_id && <div><div style={{ fontSize:'10px', color:'var(--text-3)' }}>Unidade</div><div style={{ fontSize:'12px', color:'var(--text)' }}>{(c as any).unidade_interesse?.nome ?? '—'}</div></div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Painel lateral */}
        {sel && (
          <div style={{ width:'300px', flexShrink:0, borderLeft:'0.5px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}
            className="painel-lateral">
            <div style={{ padding:'10px 12px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)' }}>{sel.nome}</div>
                <div style={{ fontSize:'10px', color:'var(--text-3)' }}>#{String(sel.id_amigavel).padStart(4,'0')} · {fone(sel.telefone)}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:'18px', padding:'4px', flexShrink:0 }} aria-label="Fechar painel">
                <i className="ti ti-x" aria-hidden="true"></i>
              </button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px' }}>
                {[['Tel',fone(sel.telefone)],['Origem',sel.origem.replace('_',' ')],['Interesse',sel.interesse??'—'],['Entrada',new Date(sel.created_at).toLocaleDateString('pt-BR')]].map(([l,v])=>(
                  <div key={l}><div style={{ fontSize:'10px', color:'var(--text-3)' }}>{l}</div><div style={{ fontSize:'11px', color:'var(--text)', textTransform:'capitalize' }}>{v}</div></div>
                ))}
              </div>

              <div>
                <div style={{ fontSize:'10px', color:'var(--text-3)', marginBottom:'3px' }}>Mover etapa</div>
                <select value={novaEtapa} onChange={e => setNovaEtapa(e.target.value as FunilEtapa)} style={{ width:'100%' }}>
                  {FUNIL_ETAPAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

              <div>
                <div style={{ fontSize:'10px', color:'var(--text-3)', marginBottom:'4px' }}>Timeline</div>
                {tl.map(t => (
                  <div key={t.id} style={{ display:'flex', gap:'6px', paddingBottom:'6px', borderBottom:'0.5px solid var(--border)', marginBottom:'6px' }}>
                    <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:t.tipo==='mudanca_etapa'?eCor(t.etapa_para??''):'#888', marginTop:'4px', flexShrink:0 }}></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'11px', color:'var(--text)' }}>{t.tipo==='mudanca_etapa'?`→ ${eLabel(t.etapa_para??'')}`:t.tipo==='criacao'?'Cadastrado':'Nota'}</div>
                      {t.nota && <div style={{ fontSize:'10px', color:'var(--text-2)', fontStyle:'italic', padding:'3px 6px', background:'var(--bg-2)', borderRadius:'4px', marginTop:'2px', display:'flex', alignItems:'flex-start', gap:'6px' }}>
                        <span style={{ flex:1 }}>{t.nota}</span>
                        {t.tipo === 'nota' && (
                          <button onClick={() => deletarNota(t.id)} disabled={deletando===t.id} title="Apagar nota" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red-text)', fontSize:'12px', padding:'0', flexShrink:0, lineHeight:1 }}>
                            {deletando===t.id ? '…' : '✕'}
                          </button>
                        )}
                      </div>}
                      <div style={{ fontSize:'10px', color:'var(--text-3)', marginTop:'2px' }}>
                        {new Date(t.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        {(t as any).autor ? ` · ${(t as any).autor.name}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Adicionar observação..." style={{ width:'100%', minHeight:'52px', resize:'vertical' }}/>
                <div style={{ display:'flex', gap:'5px', marginTop:'5px' }}>
                  <button onClick={() => setNota('')} style={{ flex:1, fontSize:'12px', padding:'6px' }}>Limpar</button>
                  <button onClick={salvar} disabled={salvando} style={{ flex:1, fontSize:'12px', padding:'6px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer' }}>
                    {salvando ? '...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: painel como modal full screen */}
      <style>{`
        @media(max-width:640px){
          .painel-lateral{
            position:fixed!important;inset:0!important;
            width:100%!important;z-index:150!important;
          }
        }
      `}</style>
    </div>
  )
}
