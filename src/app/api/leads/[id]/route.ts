import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  const agora = new Date().toISOString()

  if (body.status) {
    updates.status = body.status
    if (body.status === 'em_atendimento') updates.atendimento_em = agora
    if (body.status === 'convertido' || body.status === 'perdido') updates.encerrado_em = agora
  }
  if (body.observacao !== undefined) updates.observacao = body.observacao
  if (body.interesse !== undefined) updates.interesse = body.interesse

  const { data, error } = await supabase
    .from('leads').update(updates).eq('id', id)
    .select('*, empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp), corretor:users(id,name,phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase.rpc('gerar_link_whatsapp', { p_lead_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}
