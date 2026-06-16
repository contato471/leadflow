export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const admin = createAdminSupabase()
  let query = admin.from('propostas')
    .select('*,cliente:clientes(id,nome,telefone),corretor:users(id,name,phone),unidade:unidades(id,nome,empreendimento_id,empreendimento:empreendimentos(nome,slug))')
    .order('created_at', { ascending: false })
  if (profile?.role === 'corretor') query = query.eq('corretor_id', user.id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ propostas: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('propostas').insert({
    cliente_id: body.cliente_id || null,
    corretor_id: body.corretor_id || user.id,
    unidade_id: body.unidade_id || null,
    dados: body.dados ?? {},
    status: 'rascunho',
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposta: data })
}
