export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const empId = searchParams.get('empreendimento_id')
  const corretorId = searchParams.get('corretor_id')
  const admin = createAdminSupabase()
  let query = admin
    .from('leads')
    .select('*, empreendimento:empreendimentos(id,nome,slug), corretor:users(id,name,phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(200)
  if (status) query = query.eq('status', status)
  if (empId) query = query.eq('empreendimento_id', empId)
  if (corretorId) query = query.eq('corretor_id', corretorId)
  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data, total: count })
}
