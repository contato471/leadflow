'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const links = [
  { href: '/adm', label: 'Dashboard', icon: '⊞' },
  { href: '/adm/corretores', label: 'Corretores', icon: '👥' },
  { href: '/adm/empreendimentos', label: 'Empreendimentos', icon: '🏢' },
  { href: '/adm/relatorios', label: 'Relatórios', icon: '📊' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
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

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="app-shell">
      <nav className="topnav">
        <a href="/adm" className="topnav-logo">LeadFlow</a>
        <span className="topnav-role adm">ADM</span>
        <div className="topnav-nav">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className={`topnav-link${pathname === l.href ? ' active' : ''}`}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="topnav-actions">
          <button className="theme-btn" onClick={toggleTheme} title="Alternar tema">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={logout} style={{ fontSize: '12px' }}>Sair</button>
        </div>
      </nav>

      {children}

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className={`bottom-nav-item${pathname === l.href ? ' active' : ''}`}>
              <span style={{ fontSize: '20px' }}>{l.icon}</span>
              <span>{l.label.split(' ')[0]}</span>
            </a>
          ))}
          <button className="bottom-nav-item" onClick={logout}>
            <span style={{ fontSize: '20px' }}>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
