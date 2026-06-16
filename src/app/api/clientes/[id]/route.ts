export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'
import type { FunilEtapa } from '@/types'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const admin = createAdminSupabase()
  const [{ data: cliente }, { data: timeline }] = await Promise.all([
    admin.from('clientes').select('*,empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp),corretor:users(id,name,phone,avatar_url)').eq('id', id).single(),
    admin.from('cliente_timeline').select('*,autor:users(id,name,avatar_url)').eq('cliente_id', id).order('created_at', { ascending: true }),
  ])
  return NextResponse.json({ cliente, timeline })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminSupabase()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.nome !== undefined) updates.nome = body.nome
  if (body.telefone !== undefined) updates.telefone = body.telefone.replace(/\D/g, '')
  if (body.email !== undefined) updates.email = body.email
  if (body.interesse !== undefined) updates.interesse = body.interesse
  if (body.empreendimento_id !== undefined) updates.empreendimento_id = body.empreendimento_id
  if (body.observacao !== undefined) updates.observacao = body.observacao
  // Corretor pode ser nulo — sempre aceitar
  if ('corretor_id' in body) updates.corretor_id = body.corretor_id || null

  if (body.etapa !== undefined) {
    const { data: atual } = await admin.from('clientes').select('etapa').eq('id', id).single()
    updates.etapa = body.etapa
    await admin.from('cliente_timeline').insert({
      cliente_id: id, autor_id: user.id,
      etapa_de: atual?.etapa ?? null, etapa_para: body.etapa as FunilEtapa,
      nota: body.nota ?? null, tipo: 'mudanca_etapa',
    })
  } else if (body.nota) {
    await admin.from('cliente_timeline').insert({
      cliente_id: id, autor_id: user.id, nota: body.nota, tipo: 'nota',
    })
  }

  const { data, error } = await admin.from('clientes').update(updates).eq('id', id)
    .select('*,empreendimento:empreendimentos(id,nome,slug),corretor:users(id,name,phone,avatar_url)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cliente: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adm') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const admin = createAdminSupabase()
  await admin.from('clientes').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
