import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const hoje = new Date().toISOString().split('T')[0]

  const [{ data: leadsHoje }, { data: aguardando }, { data: atendimento }, { data: convertidos }] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', hoje),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'novo').is('corretor_id', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'em_atendimento'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'convertido').gte('encerrado_em', hoje),
  ])

  const totalHoje = (leadsHoje as unknown as { count: number })?.count ?? 0
  const convHoje = (convertidos as unknown as { count: number })?.count ?? 0

  return NextResponse.json({
    leads_hoje: totalHoje,
    aguardando: (aguardando as unknown as { count: number })?.count ?? 0,
    em_atendimento: (atendimento as unknown as { count: number })?.count ?? 0,
    convertidos_hoje: convHoje,
    taxa_conversao: totalHoje > 0 ? Math.round((convHoje / totalHoje) * 100) : 0,
  })
}
