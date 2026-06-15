import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(list: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: profile } = await supabase
    .from('users').select('role, active').eq('id', user.id).single()

  if (!profile?.active) return NextResponse.redirect(new URL('/login?erro=conta_inativa', req.url))

  // Redireciona raiz
  if (pathname === '/') {
    return NextResponse.redirect(new URL(profile?.role === 'adm' ? '/crm' : '/corretor', req.url))
  }

  // Redireciona /adm/* para /crm/*
  if (pathname.startsWith('/adm')) {
    const newPath = pathname.replace('/adm', '/crm/leads')
    if (pathname === '/adm') return NextResponse.redirect(new URL('/crm', req.url))
    return NextResponse.redirect(new URL(pathname.replace('/adm', '/crm'), req.url))
  }

  // Corretor não pode acessar /crm/corretores, /crm/relatorios
  if (profile?.role === 'corretor' && (pathname.startsWith('/crm/corretores') || pathname.startsWith('/crm/relatorios') || pathname.startsWith('/crm/empreendimentos'))) {
    return NextResponse.redirect(new URL('/corretor', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
