export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('propostas')
    .select('*,cliente:clientes(id,nome,telefone,email),corretor:users(id,name,phone),unidade:unidades(id,nome,valor_total,empreendimento:empreendimentos(nome,slug))')
    .eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposta: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminSupabase()
  const updates: Record<string,unknown> = { updated_at: new Date().toISOString() }
  if (body.dados !== undefined) updates.dados = body.dados
  if (body.doc_identidade_url !== undefined) updates.doc_identidade_url = body.doc_identidade_url
  if (body.doc_residencia_url !== undefined) updates.doc_residencia_url = body.doc_residencia_url
  if (body.proposta_feita !== undefined) {
    updates.proposta_feita = body.proposta_feita
    if (body.proposta_feita) updates.feita_em = new Date().toISOString()
  }
  const { data, error } = await admin.from('propostas').update(updates).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposta: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const admin = createAdminSupabase()
  await admin.from('propostas').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
