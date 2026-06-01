'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Lead, User, Empreendimento } from '@/types'

export default function RelatoriosPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [corretores, setCorretores] = useState<User[]>([])
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('7d')
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const diasAtras = periodo === '1d' ? 1 : periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
    const desde = new Date(Date.now() - diasAtras * 86400000).toISOString()

    const [{ data: leadsData }, { data: corsData }, { data: empsData }] = await Promise.all([
      supabase.from('leads').select('*, empreendimento:empreendimentos(id,nome,slug), corretor:users(id,name)')
        .gte('created_at', desde).order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'corretor').eq('active', true).order('name'),
      supabase.from('empreendimentos').select('*').eq('ativo', true).order('nome'),
    ])

    setLeads((leadsData as Lead[]) ?? [])
    setCorretores(corsData ?? [])
    setEmps(empsData ?? [])
    setLoading(false)
  }, [supabase, periodo])

  useEffect(() => { carregar() }, [carregar])

  // Stats por corretor
  const statsCor = corretores.map(cor => {
    const meus = leads.filter(l => l.corretor_id === cor.id)
    return {
      corretor: cor,
      total: meus.length,
      convertidos: meus.filter(l => l.status === 'convertido').length,
      perdidos: meus.filter(l => l.status === 'perdido').length,
      em_atendimento: meus.filter(l => l.status === 'em_atendimento').length,
      taxa: meus.length > 0 ? Math.round((meus.filter(l => l.status === 'convertido').length / meus.length) * 100) : 0,
    }
  }).sort((a, b) => b.convertidos - a.convertidos)

  // Stats por empreendimento
  const statsEmp = emps.map(emp => {
    const meus = leads.filter(l => l.empreendimento_id === emp.id)
    return {
      emp,
      total: meus.length,
      convertidos: meus.filter(l => l.status === 'convertido').length,
      taxa: meus.length > 0 ? Math.round((meus.filter(l => l.status === 'convertido').length / meus.length) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)

  if (loading) return <div className="loading">Carregando...</div>

  const totalConv = leads.filter(l => l.status === 'convertido').length
  const taxaGeral = leads.length > 0 ? Math.round((totalConv / leads.length) * 100) : 0

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="1d">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total de leads', value: leads.length },
          { label: 'Convertidos', value: totalConv, success: true },
          { label: 'Taxa de conversão', value: `${taxaGeral}%` },
          { label: 'Perdidos', value: leads.filter(l => l.status === 'perdido').length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.success ? 'var(--teal)' : undefined }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
        {/* Por corretor */}
        <div className="table-wrap">
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, fontSize: '13px' }}>
            Por corretor
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Corretor</th>
                <th>Total</th>
                <th>Conv.</th>
                <th>Taxa</th>
              </tr>
            </thead>
            <tbody>
              {statsCor.map(s => (
                <tr key={s.corretor.id}>
                  <td style={{ fontWeight: 500 }}>{s.corretor.name}</td>
                  <td>{s.total}</td>
                  <td style={{ color: 'var(--teal)' }}>{s.convertidos}</td>
                  <td>
                    <span style={{
                      fontSize: '12px', padding: '1px 6px', borderRadius: '20px',
                      background: s.taxa >= 30 ? 'var(--green-bg)' : s.taxa >= 15 ? 'var(--amber-bg)' : 'var(--bg-2)',
                      color: s.taxa >= 30 ? 'var(--green-text)' : s.taxa >= 15 ? 'var(--amber-text)' : 'var(--text-3)',
                    }}>
                      {s.taxa}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Por empreendimento */}
        <div className="table-wrap">
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', fontWeight: 500, fontSize: '13px' }}>
            Por empreendimento
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Empreendimento</th>
                <th>Total</th>
                <th>Conv.</th>
                <th>Taxa</th>
              </tr>
            </thead>
            <tbody>
              {statsEmp.map(s => (
                <tr key={s.emp.id}>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{s.emp.slug}</span>
                  </td>
                  <td>{s.total}</td>
                  <td style={{ color: 'var(--teal)' }}>{s.convertidos}</td>
                  <td>
                    <span style={{
                      fontSize: '12px', padding: '1px 6px', borderRadius: '20px',
                      background: s.taxa >= 30 ? 'var(--green-bg)' : s.taxa >= 15 ? 'var(--amber-bg)' : 'var(--bg-2)',
                      color: s.taxa >= 30 ? 'var(--green-text)' : s.taxa >= 15 ? 'var(--amber-text)' : 'var(--text-3)',
                    }}>
                      {s.taxa}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
