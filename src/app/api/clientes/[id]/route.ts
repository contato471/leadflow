export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const [{ data: cliente }, { data: timeline }] = await Promise.all([
    supabase.from('clientes').select('*,empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp),corretor:users(id,name,phone)').eq('id', id).single(),
    supabase.from('cliente_timeline').select('*,autor:users(id,name)').eq('cliente_id', id).order('created_at', { ascending: true }),
  ])
  return NextResponse.json({ cliente, timeline })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.telefone !== undefined) updates.telefone = body.telefone.replace(/\D/g,'')
  if (body.email !== undefined) updates.email = body.email
  if (body.interesse !== undefined) updates.interesse = body.interesse
  if (body.empreendimento_id !== undefined) updates.empreendimento_id = body.empreendimento_id
  if (body.corretor_id !== undefined) updates.corretor_id = body.corretor_id
  if (body.etapa !== undefined) {
    const { data: atual } = await supabase.from('clientes').select('etapa').eq('id', id).single()
    updates.etapa = body.etapa
    await supabase.from('cliente_timeline').insert({ cliente_id: id, autor_id: user.id, etapa_de: atual?.etapa ?? null, etapa_para: body.etapa, nota: body.nota ?? null, tipo: 'mudanca_etapa' })
  } else if (body.nota) {
    await supabase.from('cliente_timeline').insert({ cliente_id: id, autor_id: user.id, nota: body.nota, tipo: 'nota' })
  }
  const { data, error } = await supabase.from('clientes').update(updates).eq('id', id).select('*,empreendimento:empreendimentos(id,nome,slug),corretor:users(id,name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cliente: data })
}
