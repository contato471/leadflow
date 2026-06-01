'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'

const links = [
  { href: '/adm', label: 'Dashboard' },
  { href: '/adm/corretores', label: 'Corretores' },
  { href: '/adm/empreendimentos', label: 'Empreendimentos' },
  { href: '/adm/relatorios', label: 'Relatórios' },
]

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserSupabase()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="app-shell">
      <nav className="topnav">
        <span style={{ fontSize: '15px', fontWeight: 500 }}>LeadFlow</span>
        <span className="topnav-role adm">ADM</span>
        <div className="topnav-nav">
          {links.map(l => (
            <a key={l.href} href={l.href} className={`topnav-link${pathname === l.href ? ' active' : ''}`}>
              {l.label}
            </a>
          ))}
        </div>
        <button onClick={logout} style={{ marginLeft: 'auto', fontSize: '12px' }}>Sair</button>
      </nav>
      {children}
    </div>
  )
}
