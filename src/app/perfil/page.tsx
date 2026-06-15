'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

function ini(n: string) { return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }

export default function PerfilPage() {
  const [user, setUser] = useState<User|null>(null)
  const [form, setForm] = useState({ name:'', phone:'', avatar_url:'' })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ nova:'', confirmar:'' })
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const supabase = createBrowserSupabase()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/perfil').then(r=>r.json()).then(d => {
      setUser(d.user)
      setForm({ name:d.user.name, phone:d.user.phone??'', avatar_url:d.user.avatar_url??'' })
    })
  }, [])

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    await fetch('/api/perfil', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    setSalvando(false); setSalvo(true)
    setTimeout(()=>setSalvo(false), 3000)
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha('')
    if (senhaForm.nova !== senhaForm.confirmar) { setErroSenha('As senhas não coincidem.'); return }
    if (senhaForm.nova.length < 6) { setErroSenha('Mínimo 6 caracteres.'); return }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })
    setSalvandoSenha(false)
    if (error) { setErroSenha(error.message); return }
    setSenhaOk(true); setSenhaForm({ nova:'', confirmar:'' })
    setTimeout(()=>setSenhaOk(false), 3000)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'var(--text-3)',fontSize:'14px'}}>Carregando...</div>

  const corAv = ['#EEEDFE','#E1F5EE','#FAECE7','#E6F1FB'][user.name.charCodeAt(0)%4]
  const corTx = ['#3C3489','#085041','#712B13','#0C447C'][user.name.charCodeAt(0)%4]

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
      <div style={{ width:'100%', maxWidth:'460px', display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* Avatar */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', padding:'20px', background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
          <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:form.avatar_url?'transparent':corAv, color:corTx, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:500, overflow:'hidden', border:'2px solid var(--border)' }}>
            {form.avatar_url ? <img src={form.avatar_url} alt="Avatar" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : ini(form.name||'U')}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'16px', fontWeight:500, color:'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize:'12px', color:'var(--text-3)', marginTop:'2px' }}>{user.role === 'adm' ? '👑 Administrador' : '🏠 Corretor'}</div>
          </div>
        </div>

        {/* Dados */}
        <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'14px' }}>Meus dados</div>
          <form onSubmit={salvarPerfil} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Nome</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>E-mail</label>
              <input value={user.email} disabled style={{ opacity:.5 }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Telefone / WhatsApp</label>
              <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="(71) 99999-0000" />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Foto de perfil (URL)</label>
              <input type="url" value={form.avatar_url} onChange={e=>setForm(p=>({...p,avatar_url:e.target.value}))} placeholder="https://..." />
            </div>
            <button type="submit" disabled={salvando} style={{ padding:'9px', fontSize:'13px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:500, marginTop:'4px' }}>
              {salvando?'Salvando...':salvo?'✓ Salvo!':'Salvar alterações'}
            </button>
          </form>
        </div>

        {/* Senha */}
        <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text)', marginBottom:'14px' }}>Trocar senha</div>
          <form onSubmit={trocarSenha} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Nova senha</label>
              <input type="password" value={senhaForm.nova} onChange={e=>setSenhaForm(p=>({...p,nova:e.target.value}))} placeholder="mínimo 6 caracteres" required />
            </div>
            <div>
              <label style={{ fontSize:'11px', color:'var(--text-2)', display:'block', marginBottom:'3px' }}>Confirmar nova senha</label>
              <input type="password" value={senhaForm.confirmar} onChange={e=>setSenhaForm(p=>({...p,confirmar:e.target.value}))} placeholder="repita a senha" required />
            </div>
            {erroSenha && <p style={{fontSize:'12px',color:'var(--red-text)'}}>{erroSenha}</p>}
            <button type="submit" disabled={salvandoSenha} style={{ padding:'9px', fontSize:'13px' }}>
              {salvandoSenha?'Salvando...':senhaOk?'✓ Senha alterada!':'Trocar senha'}
            </button>
          </form>
        </div>

        {/* Sair */}
        <button onClick={logout} style={{ padding:'12px', fontSize:'13px', background:'var(--red-bg)', color:'var(--red-text)', border:'0.5px solid var(--red-text)', borderRadius:'var(--radius-lg)', cursor:'pointer', fontWeight:500 }}>
          → Sair do sistema
        </button>

      </div>
    </div>
  )
}
