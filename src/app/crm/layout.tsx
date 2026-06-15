'use client'
export const dynamic = 'force-dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV = [
  { sec:'CRM', href:'/crm/dashboard', label:'Dashboard', icon:'ti-layout-dashboard' },
  { sec:'CRM', href:'/crm/funil', label:'Funil de vendas', icon:'ti-layout-columns' },
  { sec:'CRM', href:'/crm/clientes', label:'Banco de clientes', icon:'ti-users' },
  { sec:'Comercial', href:'/adm', label:'Leads', icon:'ti-bolt' },
  { sec:'Comercial', href:'/adm/corretores', label:'Corretores', icon:'ti-id-badge' },
  { sec:'Comercial', href:'/adm/empreendimentos', label:'Empreendimentos', icon:'ti-building' },
  { sec:'Comercial', href:'/adm/relatorios', label:'Relatórios', icon:'ti-chart-bar' },
  { sec:'Sistema', href:'/perfil', label:'Perfil', icon:'ti-user' },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [userName, setUserName] = useState('ADM')
  const [col, setCol] = useState(false)

  useEffect(() => {
    const t = (localStorage.getItem('theme') as 'light'|'dark') ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(t); document.documentElement.setAttribute('data-theme', t)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('users').select('name').eq('id', user.id).single().then(({ data }) => { if (data) setUserName(data.name) })
    })
  }, [supabase])

  function toggleTheme() {
    const n = theme === 'light' ? 'dark' : 'light'
    setTheme(n); localStorage.setItem('theme', n); document.documentElement.setAttribute('data-theme', n)
  }

  const sections = ['CRM','Comercial','Sistema']

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-3)' }}>
      <aside style={{ width: col ? '50px' : '200px', flexShrink:0, background:'var(--bg)', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', transition:'width .2s', overflow:'hidden' }}>
        <div style={{ padding:'12px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:'8px', height:'52px' }}>
          {!col && <span style={{ fontSize:'14px', fontWeight:500, color:'var(--text)', flex:1, whiteSpace:'nowrap' }}>LeadFlow</span>}
          <button onClick={() => setCol(c => !c)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:'16px', padding:0, flexShrink:0 }} aria-label="toggle">
            <i className={`ti ${col ? 'ti-menu-2' : 'ti-layout-sidebar'}`} aria-hidden="true"></i>
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'4px' }}>
          {sections.map(sec => (
            <div key={sec}>
              {!col && <div style={{ padding:'8px 6px 2px', fontSize:'10px', fontWeight:500, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{sec}</div>}
              {NAV.filter(n => n.sec === sec).map(item => {
                const active = pathname === item.href || (item.href.length > 4 && pathname.startsWith(item.href))
                return (
                  <a key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:'8px', padding: col ? '8px' : '6px 8px', fontSize:'12px', color: active ? 'var(--text)' : 'var(--text-2)', borderRadius:'var(--radius)', margin:'1px 0', background: active ? 'var(--bg-2)' : 'transparent', fontWeight: active ? 500 : 400, textDecoration:'none', justifyContent: col ? 'center' : 'flex-start' }}>
                    <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize:'15px', flexShrink:0 }}></i>
                    {!col && <span style={{ whiteSpace:'nowrap' }}>{item.label}</span>}
                  </a>
                )
              })}
              {!col && sec !== 'Sistema' && <div style={{ height:'0.5px', background:'var(--border)', margin:'4px 0' }} />}
            </div>
          ))}
        </div>
        <div style={{ borderTop:'0.5px solid var(--border)', padding:'6px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px', justifyContent: col ? 'center' : 'flex-start' }}>
            <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#EEEDFE', color:'#3C3489', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:500, flexShrink:0 }}>{userName[0]}</div>
            {!col && <div style={{ fontSize:'11px', fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</div>}
          </div>
          <div style={{ display:'flex', gap:'4px', justifyContent: col ? 'center' : 'flex-start' }}>
            <button onClick={toggleTheme} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:'3px' }}>{theme==='light'?'🌙':'☀️'}</button>
            {!col && <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ fontSize:'11px', padding:'3px 6px', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)' }}>Sair</button>}
          </div>
        </div>
      </aside>
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>{children}</main>
    </div>
  )
}
