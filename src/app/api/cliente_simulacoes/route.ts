export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('cliente_id')
  if (!clienteId) return NextResponse.json({ simulacoes: [] })
  const admin = createAdminSupabase()
  const { data } = await admin.from('cliente_simulacoes')
    .select('*,unidade:unidades(id,nome,valor_total,empreendimento:empreendimentos(nome,slug)),autor:users(id,name)')
    .eq('cliente_id', clienteId).order('created_at', { ascending: false })
  return NextResponse.json({ simulacoes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('cliente_simulacoes').insert({
    cliente_id: body.cliente_id,
    unidade_id: body.unidade_id || null,
    autor_id: user.id,
    dados: body.dados ?? {},
    mensagem_gerada: body.mensagem_gerada || null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ simulacao: data })
}
