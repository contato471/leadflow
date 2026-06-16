export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET() {
  const admin = createAdminSupabase()
  const { data } = await admin.from('configuracoes').select('*')
  const map: Record<string,string> = {}
  data?.forEach(r => { map[r.chave] = r.valor })
  return NextResponse.json(map)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adm') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const body = await req.json()
  const admin = createAdminSupabase()
  for (const [chave, valor] of Object.entries(body)) {
    await admin.from('configuracoes').upsert({ chave, valor: valor as string, updated_at: new Date().toISOString() })
  }
  return NextResponse.json({ ok: true })
}
