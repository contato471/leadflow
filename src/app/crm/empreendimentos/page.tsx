'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Empreendimento } from '@/types'
import { EMPREENDIMENTOS_LISTA } from '@/lib/empreendimentos'

type EmpComStats = Empreendimento & {
  leads_total: number; clientes_total: number; unidades_total: number
  unidades_disponiveis: number; unidades_vendidas: number
}

export default function EmpreendimentosPage() {
  const [emps, setEmps] = useState<EmpComStats[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Empreendimento | null>(null)
  const [msgForm, setMsgForm] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const [empsRes, leadsRes, clientesRes, unidsRes] = await Promise.all([
      supabase.from('empreendimentos').select('*').order('nome'),
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/clientes?limit=500').then(r => r.json()),
      fetch('/api/unidades').then(r => r.json()),
    ])
    const empsList = empsRes.data ?? []
    const leads = leadsRes.leads ?? []
    const clientes = clientesRes.clientes ?? []
    const unidades = unidsRes.unidades ?? []

    const lista: EmpComStats[] = empsList.map((e: Empreendimento) => ({
      ...e,
      leads_total: leads.filter((l: any) => l.empreendimento_id === e.id).length,
      clientes_total: clientes.filter((c: any) => c.empreendimento_id === e.id).length,
      unidades_total: unidades.filter((u: any) => u.empreendimento_id === e.id).length,
      unidades_disponiveis: unidades.filter((u: any) => u.empreendimento_id === e.id && u.status === 'disponivel').length,
      unidades_vendidas: unidades.filter((u: any) => u.empreendimento_id === e.id && u.status === 'vendido').length,
    }))

    setEmps(lista)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function salvarMsg() {
    if (!editando) return
    setSalvando(true)
    await supabase.from('empreendimentos').update({ mensagem_whatsapp: msgForm }).eq('id', editando.id)
    setSalvando(false); setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
    await carregar()
  }

  if (loading) return <div className="loading">Carregando...</div>

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
      <span style={{ fontSize:'18px', fontWeight:600, color:'var(--text)' }}>Empreendimentos</span>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'12px' }}>
        {emps.map(e => {
          const info = EMPREENDIMENTOS_LISTA.find(x => x.sigla === e.slug.toUpperCase())
          const txVenda = e.unidades_total > 0 ? ((e.unidades_vendidas / e.unidades_total) * 100).toFixed(0) : '0'
          const isEdit = editando?.id === e.id
          return (
            <div key={e.id} style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
              {/* Header do card */}
              <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'flex-start', gap:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'var(--radius)', background:'var(--teal-bg)', border:'0.5px solid var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'var(--teal-text)' }}>{e.slug}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text)' }}>{e.nome}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'2px' }}>
                    {info?.cidade ?? '—'}
                    {e.ativo
                      ? <span style={{ marginLeft:'8px', fontSize:'11px', color:'#1D9E75', fontWeight:500 }}>● Ativo</span>
                      : <span style={{ marginLeft:'8px', fontSize:'11px', color:'#E24B4A', fontWeight:500 }}>● Inativo</span>
                    }
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', padding:'10px 16px', borderBottom:'0.5px solid var(--border)', gap:'4px' }}>
                {[
                  { l:'Leads', v:e.leads_total, c:'#378ADD' },
                  { l:'Clientes', v:e.clientes_total, c:'var(--text)' },
                  { l:'Lotes', v:e.unidades_total, c:'var(--text)' },
                  { l:'Disponíveis', v:e.unidades_disponiveis, c:'#1D9E75' },
                  { l:'Vendidos', v:e.unidades_vendidas, c:'#E24B4A' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'10px', color:'var(--text-3)' }}>{s.l}</div>
                    <div style={{ fontSize:'16px', fontWeight:700, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Barra de vendas */}
              {e.unidades_total > 0 && (
                <div style={{ padding:'8px 16px', borderBottom:'0.5px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-3)', marginBottom:'4px' }}>
                    <span>Progresso de vendas</span>
                    <span style={{ fontWeight:600, color:'#E24B4A' }}>{txVenda}%</span>
                  </div>
                  <div style={{ height:'6px', background:'var(--bg-2)', borderRadius:'3px', overflow:'hidden', display:'flex' }}>
                    <div style={{ height:'100%', width:`${txVenda}%`, background:'#E24B4A', borderRadius:'3px' }}></div>
                    <div style={{ height:'100%', width:`${e.unidades_total > 0 ? (e.unidades_disponiveis / e.unidades_total) * 100 : 0}%`, background:'#1D9E75' }}></div>
                  </div>
                </div>
              )}

              {/* Mensagem WhatsApp */}
              <div style={{ padding:'12px 16px' }}>
                <div style={{ fontSize:'12px', fontWeight:500, color:'var(--text-2)', marginBottom:'6px' }}>Mensagem de atendimento WhatsApp</div>
                {isEdit ? (
                  <div>
                    <textarea
                      value={msgForm}
                      onChange={e => setMsgForm(e.target.value)}
                      rows={3}
                      style={{ width:'100%', resize:'vertical', marginBottom:'8px' }}
                    />
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => { setEditando(null); setSalvo(false) }} style={{ flex:1, padding:'8px' }}>Cancelar</button>
                      <button onClick={salvarMsg} disabled={salvando} style={{ flex:1, padding:'8px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500 }}>
                        {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ flex:1, fontSize:'12px', color:'var(--text-3)', fontStyle:'italic', background:'var(--bg-2)', borderRadius:'var(--radius)', padding:'8px 10px', lineHeight:1.5 }}>
                      {e.mensagem_whatsapp || 'Sem mensagem configurada'}
                    </div>
                    <button onClick={() => { setEditando(e); setMsgForm(e.mensagem_whatsapp ?? '') }} style={{ fontSize:'11px', padding:'6px 10px', border:'0.5px solid var(--border-2)', borderRadius:'var(--radius)', cursor:'pointer', flexShrink:0 }}>
                      Editar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
