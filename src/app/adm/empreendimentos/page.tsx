'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Empreendimento } from '@/types'

export default function EmpreendimentosPage() {
  const [emps, setEmps] = useState<Empreendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const supabase = createBrowserSupabase()

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('empreendimentos').select('*').order('nome')
    setEmps(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function abrirEdicao(emp: Empreendimento) {
    setEditando(emp.id)
    setMensagem(emp.mensagem_whatsapp)
  }

  async function salvar(id: string) {
    setSalvando(true)
    await fetch('/api/empreendimentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, mensagem_whatsapp: mensagem }),
    })
    setSalvando(false)
    setEditando(null)
    await carregar()
  }

  async function toggleAtivo(emp: Empreendimento) {
    await fetch('/api/empreendimentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id, ativo: !emp.ativo }),
    })
    await carregar()
  }

  if (loading) return <div className="loading">Carregando...</div>

  return (
    <div className="page-content">
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{emps.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ativos</div>
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{emps.filter(e => e.ativo).length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sigla</th>
              <th>Nome</th>
              <th>Mensagem WhatsApp</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {emps.map(emp => (
              <tr key={emp.id}>
                <td>
                  <span style={{ fontWeight: 500, background: 'var(--bg-2)', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>
                    {emp.slug}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{emp.nome}</td>
                <td style={{ color: 'var(--text-2)', maxWidth: '300px' }}>
                  {editando === emp.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        value={mensagem}
                        onChange={e => setMensagem(e.target.value)}
                        rows={3}
                        style={{ fontSize: '12px', resize: 'vertical' }}
                        placeholder="Use {nome} e {empreendimento} como variáveis"
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-primary" onClick={() => salvar(emp.id)} disabled={salvando} style={{ fontSize: '12px', padding: '5px 12px' }}>
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditando(null)} style={{ fontSize: '12px', padding: '5px 12px' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px' }}>{emp.mensagem_whatsapp.slice(0, 60)}...</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${emp.ativo ? 'badge-novo' : 'badge-perdido'}`}>
                    {emp.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {editando !== emp.id && (
                      <button onClick={() => abrirEdicao(emp)} style={{ fontSize: '12px', padding: '4px 10px' }}>
                        Editar msg
                      </button>
                    )}
                    <button
                      onClick={() => toggleAtivo(emp)}
                      className={emp.ativo ? 'btn-danger' : 'btn-success'}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      {emp.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
