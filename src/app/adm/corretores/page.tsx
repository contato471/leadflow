'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { User, Empreendimento } from '@/types'

type CorretorComEmps = User & {
  corretor_empreendimento: Array<{ empreendimento_id: string; participa_rodizio: boolean }>
}

const CORES = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806','#FCEBEB:#791F1F']
function corAvatar(nome: string) { const [bg, text] = CORES[nome.charCodeAt(0) % CORES.length].split(':'); return { bg, text } }
function iniciais(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }

export default function CorretoresPage() {
  const [corretores, setCorretores] = useState<CorretorComEmps[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [estado, setEstado] = useState<Record<string, { emps: string[]; rodizio: boolean; active: boolean }>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [salvo, setSalvo] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const [{ data: cors }, { data: empsData }] = await Promise.all([
      supabase.from('users')
        .select('*, corretor_empreendimento(empreendimento_id, participa_rodizio)')
        .eq('role', 'corretor').order('name'),
      supabase.from('empreendimentos').select('*').eq('ativo', true).order('nome'),
    ])

    const lista = (cors as CorretorComEmps[]) ?? []
    setCorretores(lista)
    setEmps(empsData ?? [])

    const e: Record<string, { emps: string[]; rodizio: boolean; active: boolean }> = {}
    lista.forEach(c => {
      e[c.id] = {
        emps: c.corretor_empreendimento.map(x => x.empreendimento_id),
        rodizio: c.corretor_empreendimento[0]?.participa_rodizio ?? true,
        active: c.active,
      }
    })
    setEstado(e)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function toggleEmp(corretorId: string, empId: string) {
    setEstado(prev => {
      const cur = prev[corretorId]
      const idx = cur.emps.indexOf(empId)
      return {
        ...prev,
        [corretorId]: {
          ...cur,
          emps: idx >= 0 ? cur.emps.filter(e => e !== empId) : [...cur.emps, empId],
        },
      }
    })
  }

  async function salvar(corretorId: string) {
    setSalvando(corretorId)
    const cfg = estado[corretorId]
    await fetch('/api/rodizio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corretor_id: corretorId,
        empreendimentos: cfg.emps,
        participa_rodizio: cfg.rodizio,
        active: cfg.active,
      }),
    })
    setSalvando(null)
    setSalvo(corretorId)
    setTimeout(() => setSalvo(null), 2500)
    await carregar()
  }

  const ativos = corretores.filter(c => c.active).length
  const vinculos = Object.values(estado).reduce((a, c) => a + c.emps.length, 0)
  const filtrados = corretores.filter(c => !busca || c.name.toLowerCase().includes(busca.toLowerCase()))

  if (loading) return <div className="loading">Carregando...</div>

  return (
    <div className="page-content">
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Corretores ativos</div><div className="stat-value" style={{ color: 'var(--teal)' }}>{ativos}</div></div>
        <div className="stat-card"><div className="stat-label">Inativos</div><div className="stat-value" style={{ color: 'var(--text-3)' }}>{corretores.length - ativos}</div></div>
        <div className="stat-card"><div className="stat-label">Vínculos configurados</div><div className="stat-value">{vinculos}</div></div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '12px' }}>
        <input type="text" placeholder="Buscar corretor..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth: '240px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
        {filtrados.map(cor => {
          const cfg = estado[cor.id] ?? { emps: [], rodizio: true, active: true }
          const cv = corAvatar(cor.name)
          const aberto = expandido === cor.id

          return (
            <div key={cor.id} className="card" style={{ padding: 0, opacity: cfg.active ? 1 : 0.55 }}>
              {/* Header */}
              <div
                onClick={() => setExpandido(aberto ? null : cor.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer', borderBottom: aberto ? '0.5px solid var(--border)' : 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: cv.bg, color: cv.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
                  {iniciais(cor.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{cor.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    {cfg.emps.length} emp{cfg.emps.length !== 1 ? 's' : ''} · {cor.phone?.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3') ?? '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{cfg.active ? 'Ativo' : 'Inativo'}</span>
                  <button
                    className={`toggle ${cfg.active ? 'on' : ''}`}
                    onClick={e => { e.stopPropagation(); setEstado(p => ({ ...p, [cor.id]: { ...p[cor.id], active: !p[cor.id].active } })) }}
                    aria-label="Ativar/desativar"
                  />
                </div>
              </div>

              {/* Body expandido */}
              {aberto && (
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>
                    Empreendimentos
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {emps.map(e => (
                      <button
                        key={e.id}
                        className={`chip ${cfg.emps.includes(e.id) ? 'sel' : ''}`}
                        onClick={() => toggleEmp(cor.id, e.id)}
                        title={e.nome}
                      >
                        {cfg.emps.includes(e.id) ? '✓ ' : '+ '}{e.slug}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid var(--border)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
                      Participar do rodízio
                      <button
                        className={`toggle ${cfg.rodizio ? 'on' : ''}`}
                        onClick={() => setEstado(p => ({ ...p, [cor.id]: { ...p[cor.id], rodizio: !p[cor.id].rodizio } }))}
                        aria-label="Rodízio"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {salvo === cor.id && (
                        <span style={{ fontSize: '12px', color: 'var(--teal)' }}>✓ Salvo</span>
                      )}
                      <button
                        className="btn-primary"
                        onClick={() => salvar(cor.id)}
                        disabled={salvando === cor.id}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        {salvando === cor.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
