import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const empId = searchParams.get('empreendimento_id')
  const corretorId = searchParams.get('corretor_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '100')
  const offset = (page - 1) * limit

  let query = supabase
    .from('leads')
    .select('*, empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp), corretor:users(id,name,phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (empId) query = query.eq('empreendimento_id', empId)
  if (corretorId) query = query.eq('corretor_id', corretorId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data, total: count, page, limit })
}
