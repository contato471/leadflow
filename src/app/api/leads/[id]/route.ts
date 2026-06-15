export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminSupabase()
  const updates: Record<string, unknown> = {}
  const agora = new Date().toISOString()

  if (body.status) {
    updates.status = body.status
    if (body.status === 'em_atendimento') updates.atendimento_em = agora
    if (body.status === 'convertido' || body.status === 'perdido') updates.encerrado_em = agora
  }
  if (body.observacao !== undefined) updates.observacao = body.observacao

  const { data: lead, error } = await admin
    .from('leads').update(updates).eq('id', id)
    .select('*, empreendimento:empreendimentos(id,nome,slug,mensagem_whatsapp), corretor:users(id,name,phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Quando corretor inicia atendimento → cria/atualiza cliente no banco automaticamente
  if (body.status === 'em_atendimento' && lead.corretor_id) {
    const { data: corretor } = await admin.from('users').select('name').eq('id', lead.corretor_id).single()

    // Verifica se já existe cliente com esse telefone
    const { data: existente } = await admin.from('clientes')
      .select('id,corretor_id').eq('telefone', lead.telefone.replace(/\D/g,'')).single()

    if (existente) {
      // Atualiza para vincular ao corretor e mover para atendimento
      await admin.from('clientes').update({
        corretor_id: lead.corretor_id,
        etapa: 'atendimento',
        lead_id: lead.id,
        updated_at: agora,
      }).eq('id', existente.id)
      await admin.from('cliente_timeline').insert({
        cliente_id: existente.id, autor_id: user.id,
        etapa_de: 'lead_novo', etapa_para: 'atendimento', tipo: 'mudanca_etapa',
        nota: `Atendimento iniciado por ${corretor?.name ?? 'corretor'}. WhatsApp aberto.`,
      })
    } else {
      // Cria novo cliente no banco
      const { data: novoCliente } = await admin.from('clientes').insert({
        nome: lead.nome,
        telefone: lead.telefone.replace(/\D/g,''),
        origem: lead.origem,
        interesse: lead.interesse,
        empreendimento_id: lead.empreendimento_id,
        corretor_id: lead.corretor_id,
        etapa: 'atendimento',
        lead_id: lead.id,
      }).select('id').single()

      if (novoCliente) {
        await admin.from('cliente_timeline').insert([
          { cliente_id: novoCliente.id, autor_id: user.id, etapa_para: 'lead_novo', tipo: 'criacao', nota: `Lead recebido via ${lead.origem}.` },
          { cliente_id: novoCliente.id, autor_id: user.id, etapa_de: 'lead_novo', etapa_para: 'atendimento', tipo: 'mudanca_etapa', nota: `Atendimento iniciado por ${corretor?.name ?? 'corretor'}. WhatsApp aberto.` },
        ])
      }
    }
  }

  return NextResponse.json({ lead })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const admin = createAdminSupabase()
  const { data } = await admin.rpc('gerar_link_whatsapp', { p_lead_id: id })
  return NextResponse.json({ link: data })
}
