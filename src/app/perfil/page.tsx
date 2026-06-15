'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { User } from '@/types'

function iniciais(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', avatar_url: '' })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ nova: '', confirmar: '' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const supabase = createBrowserSupabase()

  useEffect(() => {
    async function carregar() {
      const res = await fetch('/api/perfil')
      const data = await res.json()
      setUser(data.user)
      setForm({ name: data.user.name, phone: data.user.phone ?? '', avatar_url: data.user.avatar_url ?? '' })
      setLoading(false)
    }
    carregar()
  }, [])

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha('')
    if (senhaForm.nova !== senhaForm.confirmar) {
      setErroSenha('As senhas não coincidem.')
      return
    }
    if (senhaForm.nova.length < 6) {
      setErroSenha('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })
    setSalvandoSenha(false)
    if (error) { setErroSenha(error.message); return }
    setSenhaOk(true)
    setSenhaForm({ nova: '', confirmar: '' })
    setTimeout(() => setSenhaOk(false), 3000)
  }

  if (loading) return <div className="loading">Carregando...</div>

  const cor = user ? ['#EEEDFE:#3C3489','#E1F5EE:#085041','#FAECE7:#712B13','#E6F1FB:#0C447C'][user.name.charCodeAt(0) % 4].split(':') : ['#E1F5EE','#085041']

  return (
    <div className="page-content" style={{ maxWidth: '480px' }}>
      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: form.avatar_url ? 'transparent' : cor[0],
          color: cor[1], display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 500, overflow: 'hidden',
          border: '2px solid var(--border)',
        }}>
          {form.avatar_url
            ? <img src={form.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : iniciais(form.name || 'U')
          }
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
          {user?.role === 'adm' ? '👑 Administrador' : '🏠 Corretor'}
        </span>
      </div>

      {/* Dados do perfil */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Meus dados</div>
        <form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="field">
            <label className="field-label">Nome</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="field">
            <label className="field-label">E-mail</label>
            <input type="email" value={user?.email ?? ''} disabled style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>O e-mail não pode ser alterado aqui</span>
          </div>
          <div className="field">
            <label className="field-label">Telefone / WhatsApp</label>
            <input
              type="text" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="(71) 99999-0000"
            />
          </div>
          <div className="field">
            <label className="field-label">Foto de perfil (URL da imagem)</label>
            <input
              type="url" value={form.avatar_url}
              onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
              placeholder="https://..."
            />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Cole o link de uma foto sua</span>
          </div>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Trocar senha */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Trocar senha</div>
        <form onSubmit={trocarSenha} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="field">
            <label className="field-label">Nova senha</label>
            <input
              type="password" value={senhaForm.nova}
              onChange={e => setSenhaForm(p => ({ ...p, nova: e.target.value }))}
              placeholder="mínimo 6 caracteres" required
            />
          </div>
          <div className="field">
            <label className="field-label">Confirmar nova senha</label>
            <input
              type="password" value={senhaForm.confirmar}
              onChange={e => setSenhaForm(p => ({ ...p, confirmar: e.target.value }))}
              placeholder="repita a senha" required
            />
          </div>
          {erroSenha && <p style={{ fontSize: '13px', color: 'var(--red-text)' }}>{erroSenha}</p>}
          <button type="submit" disabled={salvandoSenha}>
            {salvandoSenha ? 'Salvando...' : senhaOk ? '✓ Senha alterada!' : 'Trocar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
