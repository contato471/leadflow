import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? '30d'
  const empId   = searchParams.get('empreendimento_id')

  const diasMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'ano': 365 }
  const dias = diasMap[periodo] ?? 30
  const desde = new Date(Date.now() - dias * 86400000).toISOString()

  let base = supabase.from('clientes').select('*')
  if (empId && empId !== 'todos') base = base.eq('empreendimento_id', empId)

  const { data: todos } = await base
  const { data: periodo_clientes } = await supabase
    .from('clientes').select('*')
    .gte('created_at', desde)

  const clientes = todos ?? []
  const recentes = periodo_clientes ?? []

  // Distribuição no funil
  const etapas = ['lead_novo','atendimento','visita_agendada','visita_realizada','proposta','venda_feita','sucesso_cliente','follow_up','sem_resposta','desistente']
  const funil = etapas.map(e => ({ etapa: e, total: clientes.filter(c => c.etapa === e).length }))

  // KPIs
  const total        = clientes.length
  const atendimento  = clientes.filter(c => c.etapa === 'atendimento').length
  const vendas       = clientes.filter(c => c.etapa === 'venda_feita' || c.etapa === 'sucesso_cliente').length
  const perdidos     = clientes.filter(c => c.etapa === 'desistente' || c.etapa === 'sem_resposta').length
  const taxaConv     = total > 0 ? ((vendas / total) * 100).toFixed(1) : '0'

  // Por origem
  const origens = ['olx','chaves_na_mao','facebook_ads','ligacao','fluxo','trello','outro']
  const porOrigem = origens.map(o => ({
    origem: o,
    total: clientes.filter(c => c.origem === o).length
  })).filter(o => o.total > 0)

  // Por empreendimento
  const { data: emps } = await supabase.from('empreendimentos').select('id,nome,slug')
  const porEmp = (emps ?? []).map(e => {
    const lista = clientes.filter(c => c.empreendimento_id === e.id)
    const v = lista.filter(c => c.etapa === 'venda_feita' || c.etapa === 'sucesso_cliente').length
    return { id: e.id, nome: e.nome, slug: e.slug, total: lista.length, vendas: v, taxa: lista.length > 0 ? ((v/lista.length)*100).toFixed(1) : '0' }
  }).filter(e => e.total > 0).sort((a,b) => b.total - a.total)

  // Por corretor
  const { data: corretores } = await supabase.from('users').select('id,name').eq('role','corretor').eq('active',true)
  const porCorretor = (corretores ?? []).map(c => {
    const lista = clientes.filter(cl => cl.corretor_id === c.id)
    const v = lista.filter(cl => cl.etapa === 'venda_feita' || cl.etapa === 'sucesso_cliente').length
    return { id: c.id, nome: c.name, total: lista.length, vendas: v, taxa: lista.length > 0 ? ((v/lista.length)*100).toFixed(1) : '0' }
  }).filter(c => c.total > 0).sort((a,b) => parseFloat(b.taxa) - parseFloat(a.taxa))

  return NextResponse.json({
    kpis: { total, atendimento, vendas, perdidos, taxaConv },
    funil,
    porOrigem,
    porEmp,
    porCorretor,
    periodo,
  })
}
export const dynamic = "force-dynamic"
