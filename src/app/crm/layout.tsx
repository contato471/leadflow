'use client'
export const dynamic = 'force-dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV = [
  { sec:'CRM', href:'/crm/dashboard', label:'Dashboard', icon:'ti-layout-dashboard' },
  { sec:'CRM', href:'/crm/funil', label:'Funil de vendas', icon:'ti-layout-columns' },
  { sec:'CRM', href:'/crm/clientes', label:'Banco de clientes', icon:'ti-users' },
  { sec:'Comercial', href:'/crm/leads', label:'Leads', icon:'ti-bolt' },
  { sec:'Comercial', href:'/crm/corretores', label:'Corretores', icon:'ti-id-badge' },
  { sec:'Comercial', href:'/crm/empreendimentos', label:'Empreendimentos', icon:'ti-building' },
  { sec:'Comercial', href:'/crm/relatorios', label:'Relatórios', icon:'ti-chart-bar' },
  { sec:'Estoque', href:'/crm/estoque', label:'Unidades', icon:'ti-map-2' },
  { sec:'Sistema', href:'/perfil', label:'Perfil', icon:'ti-user' },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [userName, setUserName] = useState('...')
  const [col, setCol] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light'|'dark'|null
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = saved ?? (dark ? 'dark' : 'light')
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('users').select('name').eq('id', user.id).single()
        .then(({ data }) => { if (data) setUserName(data.name) })
    })
  }, [supabase])

  function toggleTheme() {
    const n = theme === 'light' ? 'dark' : 'light'
    setTheme(n); localStorage.setItem('theme', n)
    document.documentElement.setAttribute('data-theme', n)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sections = ['CRM', 'Comercial', 'Estoque', 'Sistema']

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg-3)'}}>
      <aside style={{width:col?'48px':'210px',flexShrink:0,background:'var(--bg)',borderRight:'0.5px solid var(--border)',display:'flex',flexDirection:'column',transition:'width .2s',overflow:'hidden'}}>
        {/* Logo */}
        <div style={{padding:'0 10px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'8px',height:'52px',flexShrink:0}}>
          {!col && <span style={{fontSize:'14px',fontWeight:600,color:'var(--teal)',flex:1,whiteSpace:'nowrap'}}>LeadFlow</span>}
          <button onClick={()=>setCol(c=>!c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'18px',padding:'4px',flexShrink:0,lineHeight:1}} title="Recolher menu">
            <i className={`ti ${col?'ti-menu-2':'ti-layout-sidebar'}`} aria-hidden="true"></i>
          </button>
        </div>

        {/* Nav */}
        <div style={{flex:1,overflowY:'auto',padding:'6px 4px'}}>
          {sections.map(sec => {
            const items = NAV.filter(n => n.sec === sec)
            return (
              <div key={sec}>
                {!col && (
                  <div style={{padding:'8px 8px 3px',fontSize:'10px',fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.07em'}}>{sec}</div>
                )}
                {items.map(item => {
                  const active = pathname === item.href || (item.href.length > 5 && pathname.startsWith(item.href))
                  return (
                    <a key={item.href} href={item.href} style={{
                      display:'flex',alignItems:'center',gap:'9px',
                      padding:col?'9px':'7px 9px',
                      fontSize:'13px',
                      color:active?'var(--text)':'var(--text-2)',
                      borderRadius:'var(--radius)',margin:'1px 0',
                      background:active?'var(--bg-2)':'transparent',
                      fontWeight:active?500:400,
                      textDecoration:'none',
                      justifyContent:col?'center':'flex-start',
                      borderLeft:active?`2px solid var(--teal)`:'2px solid transparent',
                    }}>
                      <i className={`ti ${item.icon}`} style={{fontSize:'16px',flexShrink:0}} aria-hidden="true"></i>
                      {!col && <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>}
                    </a>
                  )
                })}
                {!col && sec !== 'Sistema' && <div style={{height:'0.5px',background:'var(--border)',margin:'6px 2px'}}/>}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{borderTop:'0.5px solid var(--border)',padding:'8px 6px',flexShrink:0}}>
          {!col && (
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 4px 8px'}}>
              <div style={{width:'26px',height:'26px',borderRadius:'50%',background:'#EEEDFE',color:'#3C3489',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:600,flexShrink:0}}>{userName[0]?.toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
                <div style={{fontSize:'10px',color:'var(--text-3)'}}>Administrador</div>
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:'4px',justifyContent:col?'center':'flex-start'}}>
            <button onClick={toggleTheme} style={{background:'var(--bg-2)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',fontSize:'14px',padding:'5px 8px'}} title="Alternar tema">
              {theme==='light'?'🌙':'☀️'}
            </button>
            {!col && (
              <button onClick={logout} style={{flex:1,fontSize:'12px',padding:'5px 8px',background:'var(--bg-2)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',color:'var(--text-2)',textAlign:'left'}}>
                → Sair
              </button>
            )}
          </div>
        </div>
      </aside>

      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {children}
      </main>
    </div>
  )
}
