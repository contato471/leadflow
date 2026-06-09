'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import type { Lead, LeadStatus, User } from '@/types'

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo', em_atendimento: 'Em atendimento', convertido: 'Convertido', perdido: 'Perdido',
}
const CORES = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806']
function corAvatar(nome: string) { const [bg, text] = CORES[nome.charCodeAt(0) % CORES.length].split(':'); return { bg, text } }
function iniciais(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }
function tempoRelativo(iso: string | null) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  return `há ${Math.floor(min/60)}h`
}

export default function CorretorPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [aba, setAba] = useState<'fila'|'historico'>('fila')
  const [historico, setHistorico] = useState<Lead[]>([])
  const supabase = createBrowserSupabase()
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light'|'dark'|null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const carregar = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const { data: profile } = await supabase.from('users').select('*').eq('id', u.id).single()
    setUser(profile)
    const { data } = await supabase
      .from('leads')
      .select('*, empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp), corretor:users(id,name,phone)')
      .eq('corretor_id', u.id)
      .in('status', ['novo', 'em_atendimento'])
      .order('atribuido_em', { ascending: true })
    setLeads((data as Lead[]) ?? [])
    setLoading(false)
  }, [supabase])

  const carregarHistorico = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    const { data } = await supabase
      .from('leads')
      .select('*, empreendimento:empreendimentos(id,nome,slug)')
      .eq('corretor_id', u.id)
      .in('status', ['convertido', 'perdido'])
      .order('encerrado_em', { ascending: false })
      .limit(50)
    setHistorico((data as Lead[]) ?? [])
  }, [supabase])

  useEffect(() => {
    carregar()
    const ch = supabase.channel('leads-corretor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [carregar, supabase])

  useEffect(() => {
    if (aba === 'historico') carregarHistorico()
  }, [aba, carregarHistorico])

  async function atualizar(leadId: string, status: LeadStatus, abrirWhatsApp = false) {
    setAtualizando(leadId)
    if (abrirWhatsApp) {
      const { data } = await supabase.rpc('gerar_link_whatsapp', { p_lead_id: leadId })
      if (data) window.open(data, '_blank')
    }
    const updates: Record<string, unknown> = { status }
    if (status === 'em_atendimento') updates.atendimento_em = new Date().toISOString()
    if (status === 'convertido' || status === 'perdido') updates.encerrado_em = new Date().toISOString()
    await supabase.from('leads').update(updates).eq('id', leadId)
    await carregar()
    setAtualizando(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="loading">Carregando...</div>

  const novos = leads.filter(l => l.status === 'novo').length

  return (
    <div className="app-shell">
      <nav className="topnav">
        <span className="topnav-logo">LeadFlow</span>
        <span className="topnav-role">{user?.name ?? 'Corretor'}</span>
        <div className="topnav-actions">
          <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
          <a href="/perfil" style={{ fontSize: '12px', color: 'var(--text-2)', textDecoration: 'none' }}>Perfil</a>
          <button onClick={logout} style={{ fontSize: '12px' }}>Sair</button>
        </div>
      </nav>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Na fila</div><div className="stat-value">{leads.length}</div></div>
          <div className="stat-card"><div className="stat-label">Novos</div><div className="stat-value" style={{ color: novos > 0 ? 'var(--amber-text)' : undefined }}>{novos}</div></div>
          <div className="stat-card"><div className="stat-label">Atendendo</div><div className="stat-value" style={{ color: 'var(--blue-text)' }}>{leads.filter(l=>l.status==='em_atendimento').length}</div></div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {(['fila','historico'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{
                padding: '6px 14px', fontSize: '13px',
                background: aba === a ? 'var(--bg)' : 'transparent',
                border: `0.5px solid ${aba === a ? 'var(--border-2)' : 'transparent'}`,
                borderRadius: 'var(--radius)', color: aba === a ? 'var(--text)' : 'var(--text-3)',
              }}>
              {a === 'fila' ? 'Minha fila' : 'Histórico'}
            </button>
          ))}
        </div>

        {aba === 'fila' ? (
          leads.length === 0 ? (
            <div className="empty">Nenhum lead na fila. ✓</div>
          ) : (
            <div>
              {leads.map(lead => {
                const cor = corAvatar(lead.nome)
                const busy = atualizando === lead.id
                const isNovo = lead.status === 'novo'
                const emp = (lead as any).empreendimento
                return (
                  <div key={lead.id} className="lead-card" style={{ opacity: busy ? 0.6 : 1 }}>
                    <div className="lead-card-header">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div className="lead-avatar" style={{ background: cor.bg, color: cor.text }}>
                          {iniciais(lead.nome)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 500 }}>{lead.nome}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{emp?.nome ?? '—'}</div>
                        </div>
                      </div>
                      <span className={`badge badge-${lead.status === 'em_atendimento' ? 'atendimento' : lead.status}`} style={{ fontSize: '11px', padding: '3px 9px', flexShrink: 0 }}>
                        {STATUS_LABEL[lead.status]} · {tempoRelativo(lead.atribuido_em)}
                      </span>
                    </div>
                    <div className="lead-grid">
                      <div><div className="lead-field-label">Telefone</div><div className="lead-field-value">{lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}</div></div>
                      <div><div className="lead-field-label">Origem</div><div className="lead-field-value" style={{ textTransform: 'capitalize' }}>{lead.origem.replace('_',' ')}</div></div>
                      <div><div className="lead-field-label">Interesse</div><div className="lead-field-value">{lead.interesse ?? '—'}</div></div>
                      <div><div className="lead-field-label">ID</div><div className="lead-field-value" style={{ color: 'var(--text-3)', fontSize: '12px' }}>{lead.id_externo ?? lead.id.slice(0,8)}</div></div>
                    </div>
                    <div className="lead-actions">
                      <button className="btn-success" onClick={() => atualizar(lead.id,'convertido')} disabled={busy}>✓ Convertido</button>
                      {isNovo && (
                        <button onClick={() => atualizar(lead.id,'em_atendimento',true)} disabled={busy} style={{ flex: 1, fontWeight: 500 }}>
                          Iniciar + WhatsApp ↗
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => atualizar(lead.id,'perdido')} disabled={busy}>✕ Perdido</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div>
            {historico.length === 0 ? (
              <div className="empty">Nenhum lead no histórico ainda.</div>
            ) : historico.map(lead => {
              const emp = (lead as any).empreendimento
              return (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{lead.nome}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{emp?.slug ?? '—'} · {lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}</div>
                  </div>
                  <span className={`badge badge-${lead.status}`}>{STATUS_LABEL[lead.status]}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bottom-nav-item${aba==='fila'?' active':''}`} onClick={() => setAba('fila')}>
            <span style={{ fontSize: '20px' }}>📋</span><span>Fila</span>
          </button>
          <button className={`bottom-nav-item${aba==='historico'?' active':''}`} onClick={() => setAba('historico')}>
            <span style={{ fontSize: '20px' }}>📅</span><span>Histórico</span>
          </button>
          <a href="/perfil" className="bottom-nav-item">
            <span style={{ fontSize: '20px' }}>👤</span><span>Perfil</span>
          </a>
          <button className="bottom-nav-item" onClick={logout}>
            <span style={{ fontSize: '20px' }}>🚪</span><span>Sair</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
