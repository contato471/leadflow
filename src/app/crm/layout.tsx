'use client'
export const dynamic = 'force-dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'

const NAV = [
  { sec:'CRM', href:'/crm/dashboard', label:'Dashboard', icon:'ti-layout-dashboard' },
  { sec:'CRM', href:'/crm/funil', label:'Funil de vendas', icon:'ti-layout-columns' },
  { sec:'CRM', href:'/crm/clientes', label:'Banco de clientes', icon:'ti-users' },
  { sec:'Comercial', href:'/crm/leads', label:'Leads', icon:'ti-bolt' },
  { sec:'Comercial', href:'/crm/corretores', label:'Corretores', icon:'ti-id-badge' },
  { sec:'Comercial', href:'/crm/empreendimentos', label:'Empreendimentos', icon:'ti-building' },
  { sec:'Comercial', href:'/crm/relatorios', label:'Relatórios', icon:'ti-chart-bar' },
  { sec:'Estoque', href:'/crm/estoque', label:'Unidades', icon:'ti-map-2' },
  { sec:'Sistema', href:'/crm/configuracoes', label:'Configurações', icon:'ti-settings' },
  { sec:'Sistema', href:'/perfil', label:'Perfil', icon:'ti-user' },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserSupabase()
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [userName, setUserName] = useState('...')
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null)
  const [col, setCol] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light'|'dark'|null
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = saved ?? (dark?'dark':'light')
    setTheme(t); document.documentElement.setAttribute('data-theme', t)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('users').select('name,avatar_url').eq('id', user.id).single()
        .then(({ data }) => { if (data) { setUserName(data.name); setAvatarUrl(data.avatar_url) } })
    })
    // Fechar menu mobile ao navegar
    setMobileOpen(false)
  }, [pathname, supabase])

  function toggleTheme() {
    const n = theme==='light'?'dark':'light'
    setTheme(n); localStorage.setItem('theme',n); document.documentElement.setAttribute('data-theme',n)
  }

  async function logout() {
    await supabase.auth.signOut(); router.push('/login')
  }

  const sections = ['CRM','Comercial','Estoque','Sistema']

  const sidebarContent = (
    <>
      <div style={{flex:1,overflowY:'auto',padding:'6px 4px'}}>
        {sections.map(sec=>(
          <div key={sec}>
            {!col&&<div style={{padding:'8px 8px 3px',fontSize:'10px',fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.07em'}}>{sec}</div>}
            {NAV.filter(n=>n.sec===sec).map(item=>{
              const active=pathname===item.href||(item.href.length>5&&pathname.startsWith(item.href))
              return(
                <a key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} style={{display:'flex',alignItems:'center',gap:'9px',padding:col?'9px':'7px 9px',fontSize:'13px',color:active?'var(--text)':'var(--text-2)',borderRadius:'var(--radius)',margin:'1px 0',background:active?'var(--bg-2)':'transparent',fontWeight:active?500:400,textDecoration:'none',justifyContent:col?'center':'flex-start',borderLeft:active?'2px solid var(--teal)':'2px solid transparent'}}>
                  <i className={`ti ${item.icon}`} style={{fontSize:'16px',flexShrink:0}} aria-hidden="true"></i>
                  {!col&&<span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>}
                </a>
              )
            })}
            {!col&&sec!=='Sistema'&&<div style={{height:'0.5px',background:'var(--border)',margin:'6px 2px'}}/>}
          </div>
        ))}
      </div>
      <div style={{borderTop:'0.5px solid var(--border)',padding:'8px 6px',flexShrink:0}}>
        {!col&&(
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 4px 8px'}}>
            <Avatar nome={userName} avatarUrl={avatarUrl} size={28} fontSize={10}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</div>
              <div style={{fontSize:'10px',color:'var(--text-3)'}}>Administrador</div>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:'4px',justifyContent:col?'center':'flex-start'}}>
          <button onClick={toggleTheme} style={{background:'var(--bg-2)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',fontSize:'14px',padding:'5px 8px'}} title="Tema">
            {theme==='light'?'🌙':'☀️'}
          </button>
          {!col&&<button onClick={logout} style={{flex:1,fontSize:'12px',padding:'5px 8px',background:'var(--bg-2)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',cursor:'pointer',color:'var(--text-2)',textAlign:'left'}}>→ Sair</button>}
        </div>
      </div>
    </>
  )

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg-3)'}}>
      {/* Sidebar Desktop */}
      <aside className="sidebar-desktop" style={{width:col?'48px':'210px',flexShrink:0,background:'var(--bg)',borderRight:'0.5px solid var(--border)',display:'flex',flexDirection:'column',transition:'width .2s',overflow:'hidden'}}>
        <div style={{padding:'0 10px',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'8px',height:'52px',flexShrink:0}}>
          {!col&&<span style={{fontSize:'14px',fontWeight:600,color:'var(--teal)',flex:1,whiteSpace:'nowrap'}}>LeadFlow</span>}
          <button onClick={()=>setCol(c=>!c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:'18px',padding:'4px',flexShrink:0,lineHeight:1}} title="Recolher">
            <i className={`ti ${col?'ti-menu-2':'ti-layout-sidebar'}`} aria-hidden="true"></i>
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="mobile-header" style={{display:'none',position:'fixed',top:0,left:0,right:0,height:'52px',background:'var(--bg)',borderBottom:'0.5px solid var(--border)',zIndex:110,alignItems:'center',padding:'0 14px',gap:'10px'}}>
        <button onClick={()=>setMobileOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text)',fontSize:'20px',padding:'4px',lineHeight:1}}>☰</button>
        <span style={{fontSize:'14px',fontWeight:600,color:'var(--teal)',flex:1}}>LeadFlow</span>
        <button onClick={toggleTheme} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',padding:'4px'}}>{theme==='light'?'🌙':'☀️'}</button>
        <Avatar nome={userName} avatarUrl={avatarUrl} size={28} fontSize={10}/>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:120,display:'flex'}}>
          <div style={{width:'240px',background:'var(--bg)',display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)'}}>
            <div style={{padding:'0 12px',height:'52px',display:'flex',alignItems:'center',borderBottom:'0.5px solid var(--border)'}}>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--teal)',flex:1}}>LeadFlow</span>
              <button onClick={()=>setMobileOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'var(--text-3)'}}>✕</button>
            </div>
            {sidebarContent}
          </div>
          <div style={{flex:1,background:'rgba(0,0,0,0.4)'}} onClick={()=>setMobileOpen(false)}/>
        </div>
      )}

      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {children}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .sidebar-desktop { display: none !important; }
          .mobile-header { display: flex !important; }
          main { padding-top: 52px; }
        }
      `}</style>
    </div>
  )
}
