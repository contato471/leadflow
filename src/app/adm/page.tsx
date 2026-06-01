'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Lead, LeadStatus, DashboardStats, Empreendimento } from '@/types'

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo', em_atendimento: 'Em atendimento', convertido: 'Convertido', perdido: 'Perdido',
}

function tempoRelativo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h/24)}d`
}

export default function AdmDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [filtroEmp, setFiltroEmp] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const [{ data: leadsData }, { data: empsData }, statsRes] = await Promise.all([
      supabase.from('leads')
        .select('*, empreendimento:empreendimentos(id,nome,slug), corretor:users(id,name)')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('empreendimentos').select('*').eq('ativo', true).order('nome'),
      fetch('/api/dashboard').then(r => r.json()),
    ])

    setLeads((leadsData as Lead[]) ?? [])
    setEmps(empsData ?? [])
    setStats(statsRes)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    carregar()
    const ch = supabase.channel('adm-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [carregar, supabase])

  async function syncManual() {
    setSyncing(true)
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'x-sync-secret': process.env.NEXT_PUBLIC_SYNC_SECRET ?? 'leadflow_sync_2024_prime' },
    })
    await carregar()
    setSyncing(false)
  }

  const filtrados = leads.filter(l => {
    const empOk = filtroEmp === 'todos' || l.empreendimento_id === filtroEmp
    const statusOk = filtroStatus === 'todos' || l.status === filtroStatus
    const buscaOk = !busca || l.nome.toLowerCase().includes(busca.toLowerCase())
    return empOk && statusOk && buscaOk
  })

  if (loading) return <div className="loading">Carregando...</div>

  return (
    <div className="page-content">
      <div className="stats-grid">
        {[
          { label: 'Leads hoje', value: stats?.leads_hoje ?? 0 },
          { label: 'Aguardando', value: stats?.aguardando ?? 0, warn: (stats?.aguardando ?? 0) > 0 },
          { label: 'Em atendimento', value: stats?.em_atendimento ?? 0, info: true },
          { label: 'Convertidos hoje', value: stats?.convertidos_hoje ?? 0, success: true },
          { label: 'Taxa de conversão', value: `${stats?.taxa_conversao ?? 0}%` },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{
              color: s.warn ? 'var(--amber-text)' : s.info ? 'var(--blue-text)' : s.success ? 'var(--teal)' : undefined,
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text" placeholder="Buscar por nome..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: '200px', flex: 1 }}
        />
        <select value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)} style={{ maxWidth: '220px' }}>
          <option value="todos">Todos os empreendimentos</option>
          {emps.map(e => <option key={e.id} value={e.id}>{e.slug} — {e.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="todos">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="em_atendimento">Em atendimento</option>
          <option value="convertido">Convertido</option>
          <option value="perdido">Perdido</option>
        </select>
        <span style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {filtrados.length} leads
        </span>
        <button onClick={syncManual} disabled={syncing} style={{ whiteSpace: 'nowrap' }}>
          {syncing ? 'Sincronizando...' : '↻ Sincronizar'}
        </button>
      </div>

      <div className="table-wrap">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['Nome', 'Empreendimento', 'Telefone', 'Origem', 'Corretor', 'Status', 'Recebido'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 100).map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 500 }}>{lead.nome}</td>
                  <td style={{ color: 'var(--text-2)' }}>
                    {(lead as any).empreendimento?.slug ?? '—'}
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>
                    {lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}
                  </td>
                  <td style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>
                    {lead.origem.replace('_', ' ')}
                  </td>
                  <td style={{ color: (lead as any).corretor ? 'var(--text-2)' : 'var(--amber-text)' }}>
                    {(lead as any).corretor?.name ?? 'Sem corretor'}
                  </td>
                  <td>
                    <span className={`badge badge-${lead.status === 'em_atendimento' ? 'atendimento' : lead.status}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                    {tempoRelativo(lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div className="empty">Nenhum lead encontrado.</div>
          )}
        </div>
      </div>
    </div>
  )
}
