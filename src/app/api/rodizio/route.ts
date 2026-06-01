import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adm') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { corretor_id, empreendimentos, participa_rodizio, active } = await req.json()

  // Atualiza status ativo do corretor
  if (active !== undefined) {
    await supabase.from('users').update({ active }).eq('id', corretor_id)
  }

  // Remove todos os vínculos atuais do corretor
  await supabase.from('corretor_empreendimento').delete().eq('corretor_id', corretor_id)

  // Insere os novos vínculos com posição de rodízio
  if (empreendimentos?.length > 0) {
    const vinculos = empreendimentos.map((emp_id: string, idx: number) => ({
      corretor_id,
      empreendimento_id: emp_id,
      participa_rodizio: participa_rodizio ?? true,
      posicao_rodizio: idx,
    }))

    const { error } = await supabase.from('corretor_empreendimento').insert(vinculos)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const empId = searchParams.get('empreendimento_id')

  let query = supabase
    .from('rodizio_estado')
    .select('*, empreendimento:empreendimentos(id,nome,slug), proximo_corretor:users(id,name)')
    .eq('data', new Date().toISOString().split('T')[0])

  if (empId) query = query.eq('empreendimento_id', empId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rodizio: data })
}
