export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const empId = searchParams.get('empreendimento_id')
  const status = searchParams.get('status')
  let query = supabase.from('unidades')
    .select('*, empreendimento:empreendimentos(id,nome,slug)')
    .order('nome')
  if (empId) query = query.eq('empreendimento_id', empId)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ unidades: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from('unidades').insert({
    empreendimento_id: body.empreendimento_id,
    nome: body.nome,
    area_m2: body.area_m2 || null,
    valor_total: body.valor_total,
    status: body.status ?? 'disponivel',
    observacao: body.observacao ?? null,
  }).select('*, empreendimento:empreendimentos(id,nome,slug)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ unidade: data })
}
