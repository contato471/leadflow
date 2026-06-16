export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminSupabase()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.area_m2 !== undefined) updates.area_m2 = body.area_m2
  if (body.valor_total !== undefined) updates.valor_total = body.valor_total
  if (body.status !== undefined) updates.status = body.status
  if (body.observacao !== undefined) updates.observacao = body.observacao
  const { data, error } = await admin.from('unidades').update(updates).eq('id', id)
    .select('*,empreendimento:empreendimentos(id,nome,slug)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ unidade: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adm') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const admin = createAdminSupabase()
  await admin.from('unidades').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
