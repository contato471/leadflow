'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Lead, LeadStatus, User } from '@/types'

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo', em_atendimento: 'Em atendimento', convertido: 'Convertido', perdido: 'Perdido',
}

const CORES = ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C','#FAEEDA:#633806','#FCEBEB:#791F1F']
function corAvatar(nome: string) { const [bg, text] = CORES[nome.charCodeAt(0) % CORES.length].split(':'); return { bg, text } }
function iniciais(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }
function tempoRelativo(iso: string | null) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h/24)}d`
}

export default function CorretorPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const supabase = createBrowserSupabase()

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

  useEffect(() => {
    carregar()
    const ch = supabase
      .channel('leads-corretor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [carregar, supabase])

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
    window.location.href = '/login'
  }

  if (loading) return <div className="loading">Carregando...</div>

  const novos = leads.filter(l => l.status === 'novo').length
  const atendendo = leads.filter(l => l.status === 'em_atendimento').length

  return (
    <div className="app-shell">
      <nav className="topnav">
        <span style={{ fontSize: '15px', fontWeight: 500 }}>LeadFlow</span>
        <span className="topnav-role">{user?.name ?? 'Corretor'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} na fila
          </span>
          <button onClick={logout} style={{ fontSize: '12px' }}>Sair</button>
        </div>
      </nav>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Na fila</div>
            <div className="stat-value">{leads.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Novos</div>
            <div className="stat-value" style={{ color: novos > 0 ? 'var(--amber-text)' : undefined }}>{novos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Atendendo</div>
            <div className="stat-value" style={{ color: 'var(--blue-text)' }}>{atendendo}</div>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="empty">Nenhum lead na fila no momento.</div>
        ) : (
          <div>
            {leads.map(lead => {
              const cor = corAvatar(lead.nome)
              const busy = atualizando === lead.id
              const isNovo = lead.status === 'novo'

              return (
                <div key={lead.id} className="lead-card" style={{ opacity: busy ? 0.6 : 1, transition: 'opacity .2s' }}>
                  <div className="lead-card-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div className="lead-avatar" style={{ background: cor.bg, color: cor.text }}>
                        {iniciais(lead.nome)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>{lead.nome}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                          {(lead as any).empreendimento?.nome ?? '—'}
                        </div>
                      </div>
                    </div>
                    <span className={`badge badge-${lead.status === 'em_atendimento' ? 'atendimento' : lead.status}`} style={{ fontSize: '11px', padding: '3px 9px', flexShrink: 0 }}>
                      {STATUS_LABEL[lead.status]} · {tempoRelativo(lead.atribuido_em)}
                    </span>
                  </div>

                  <div className="lead-grid">
                    <div>
                      <div className="lead-field-label">Telefone</div>
                      <div className="lead-field-value">{lead.telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}</div>
                    </div>
                    <div>
                      <div className="lead-field-label">Origem</div>
                      <div className="lead-field-value" style={{ textTransform: 'capitalize' }}>{lead.origem.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="lead-field-label">Interesse</div>
                      <div className="lead-field-value">{lead.interesse ?? '—'}</div>
                    </div>
                    <div>
                      <div className="lead-field-label">ID</div>
                      <div className="lead-field-value" style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                        {lead.id_externo ?? lead.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div className="lead-actions">
                    <button className="btn-success" onClick={() => atualizar(lead.id, 'convertido')} disabled={busy}>
                      ✓ Convertido
                    </button>
                    {isNovo && (
                      <button onClick={() => atualizar(lead.id, 'em_atendimento', true)} disabled={busy} style={{ flex: 1, fontWeight: 500 }}>
                        Iniciar + WhatsApp ↗
                      </button>
                    )}
                    <button className="btn-danger" onClick={() => atualizar(lead.id, 'perdido')} disabled={busy}>
                      ✕ Perdido
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
