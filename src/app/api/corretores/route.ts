export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  // Usa admin para bypashar RLS e ler todos os corretores
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('users')
    .select('*, corretor_empreendimento(empreendimento_id, participa_rodizio)')
    .eq('role', 'corretor')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ corretores: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminSupabase()
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: body.email, password: body.password, email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
  const { error } = await admin.from('users').insert({
    id: authUser.user.id, email: body.email, name: body.name,
    role: 'corretor', phone: body.phone ?? null, active: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: authUser.user.id })
}
