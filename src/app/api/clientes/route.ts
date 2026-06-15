export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const busca = searchParams.get('busca')
  const etapa = searchParams.get('etapa')
  const empId = searchParams.get('empreendimento_id')
  let query = supabase.from('clientes')
    .select('*,empreendimento:empreendimentos(id,nome,slug),corretor:users(id,name,phone)', { count: 'exact' })
    .order('updated_at', { ascending: false }).limit(500)
  if (etapa) query = query.eq('etapa', etapa)
  if (empId) query = query.eq('empreendimento_id', empId)
  if (busca) query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clientes: data, total: count })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.from('clientes').insert({
    nome: body.nome, telefone: body.telefone.replace(/\D/g,''),
    email: body.email ?? null, origem: body.origem ?? 'outro',
    interesse: body.interesse ?? null,
    empreendimento_id: body.empreendimento_id || null,
    corretor_id: body.corretor_id || null, etapa: 'lead_novo',
  }).select('*,empreendimento:empreendimentos(id,nome,slug),corretor:users(id,name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('cliente_timeline').insert({ cliente_id: data.id, autor_id: user.id, etapa_para: 'lead_novo', tipo: 'criacao', nota: 'Cliente cadastrado.' })
  return NextResponse.json({ cliente: data })
}
