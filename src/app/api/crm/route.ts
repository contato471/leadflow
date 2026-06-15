export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: clientes } = await supabase.from('clientes').select('*')
  const todos = clientes ?? []
  const etapas = ['lead_novo','atendimento','visita_agendada','visita_realizada','proposta','venda_feita','sucesso_cliente','follow_up','sem_resposta','desistente']
  const funil = etapas.map(e => ({ etapa: e, total: todos.filter(c => c.etapa === e).length }))
  const vendas = todos.filter(c => c.etapa === 'venda_feita' || c.etapa === 'sucesso_cliente').length
  const origens = ['olx','chaves_na_mao','facebook_ads','ligacao','fluxo','trello','outro']
  const porOrigem = origens.map(o => ({ origem: o, total: todos.filter(c => c.origem === o).length })).filter(o => o.total > 0)
  const { data: emps } = await supabase.from('empreendimentos').select('id,nome,slug')
  const porEmp = (emps ?? []).map(e => {
    const lista = todos.filter(c => c.empreendimento_id === e.id)
    const v = lista.filter(c => c.etapa === 'venda_feita' || c.etapa === 'sucesso_cliente').length
    return { id: e.id, nome: e.nome, slug: e.slug, total: lista.length, vendas: v, taxa: lista.length > 0 ? ((v/lista.length)*100).toFixed(1) : '0' }
  }).filter(e => e.total > 0).sort((a,b) => b.total - a.total)
  const { data: cors } = await supabase.from('users').select('id,name').eq('role','corretor').eq('active',true)
  const porCorretor = (cors ?? []).map(c => {
    const lista = todos.filter(cl => cl.corretor_id === c.id)
    const v = lista.filter(cl => cl.etapa === 'venda_feita' || cl.etapa === 'sucesso_cliente').length
    return { id: c.id, nome: c.name, total: lista.length, vendas: v, taxa: lista.length > 0 ? ((v/lista.length)*100).toFixed(1) : '0' }
  }).filter(c => c.total > 0).sort((a,b) => parseFloat(b.taxa) - parseFloat(a.taxa))
  return NextResponse.json({ kpis: { total: todos.length, atendimento: todos.filter(c=>c.etapa==='atendimento').length, vendas, perdidos: todos.filter(c=>c.etapa==='desistente'||c.etapa==='sem_resposta').length, taxaConv: todos.length > 0 ? ((vendas/todos.length)*100).toFixed(1) : '0' }, funil, porOrigem, porEmp, porCorretor })
}
