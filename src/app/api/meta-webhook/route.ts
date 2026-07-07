export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? 'prime_meta_leads_2024'
const APP_SECRET   = process.env.META_APP_SECRET   ?? ''
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN ?? ''

// Validar telefone: deve ter DDD + 9 + 8 dígitos = 11 dígitos
function validarTelefone(tel: string): string | null {
  const limpo = tel.replace(/\D/g, '')
  // Remove 55 do começo se vier com código do país
  const semPais = limpo.startsWith('55') && limpo.length === 13 ? limpo.slice(2) : limpo
  if (semPais.length === 11 && semPais[2] === '9') return semPais
  return null
}

// Inferir nome a partir do nome bruto e email
function inferirNome(nomeBruto: string, email?: string): string {
  const nome = (nomeBruto ?? '').trim()

  // Se tem nome e parece um nome real (não é email, não é empresa)
  if (nome && nome.length > 1 && !nome.includes('@') && !nome.includes('.com')) {
    // Pega só o primeiro nome
    return nome.split(' ')[0]
  }

  // Tenta extrair do email (ex: clodoaldosilva@gmail.com → Clodoaldo)
  if (email) {
    const localPart = email.split('@')[0].replace(/[^a-zA-Z]/g, '')
    if (localPart.length > 2) {
      return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase()
    }
  }

  return 'Sem nome'
}

// Buscar dados do lead via API do Meta
async function buscarDadosLead(leadId: string): Promise<{ nome: string; telefone: string; email?: string; campanha?: string } | null> {
  if (!PAGE_ACCESS_TOKEN) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadId}?fields=field_data,created_time,ad_name,campaign_name&access_token=${PAGE_ACCESS_TOKEN}`
    )
    const data = await res.json()
    if (!data.field_data) return null

    const campos: Record<string, string> = {}
    for (const f of data.field_data) {
      campos[f.name.toLowerCase()] = f.values?.[0] ?? ''
    }

    // Campos possíveis de nome e telefone no formulário do Meta
    const nomeBruto = campos['full_name'] || campos['first_name'] || campos['nome'] || campos['name'] || ''
    const email = campos['email'] || campos['e-mail'] || undefined
    const telBruto = campos['phone_number'] || campos['telefone'] || campos['phone'] || campos['celular'] || campos['whatsapp'] || ''
    const campanha = data.campaign_name || data.ad_name || undefined

    const telefone = validarTelefone(telBruto)
    if (!telefone) return null // descarta lead sem telefone válido

    const nome = inferirNome(nomeBruto, email)

    return { nome, telefone, email, campanha }
  } catch {
    return null
  }
}

// GET — verificação do webhook pelo Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — receber leads do Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Ignorar eventos que não são de leads
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    const admin = createAdminSupabase()

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue

        const leadId   = change.value?.leadgen_id
        const pageId   = change.value?.page_id
        const formId   = change.value?.form_id

        if (!leadId) continue

        // Buscar dados do lead na API do Meta
        const dadosLead = await buscarDadosLead(leadId)
        if (!dadosLead) {
          // Telefone inválido — descarta
          console.log(`Lead ${leadId} descartado: telefone inválido`)
          continue
        }

        const { nome, telefone, email, campanha } = dadosLead

        // Verificar se lead já existe (evitar duplicata)
        const { data: existente } = await admin
          .from('leads')
          .select('id')
          .eq('telefone', telefone)
          .single()

        if (existente) {
          console.log(`Lead ${leadId} já existe (telefone ${telefone})`)
          continue
        }

        // Buscar empreendimento pelo nome da campanha
        let empreendimento_id: string | null = null
        if (campanha) {
          const slugs = ['MV','CDA','VV','PDC','VM1','BS','BI','CAC','MVE','AV1','AV2','RR','NN','BLC']
          const slugEncontrado = slugs.find(s => campanha.toUpperCase().includes(s))
          if (slugEncontrado) {
            const { data: emp } = await admin
              .from('empreendimentos')
              .select('id')
              .eq('slug', slugEncontrado)
              .single()
            empreendimento_id = emp?.id ?? null
          }
        }

        // Criar lead no sistema
        await admin.from('leads').insert({
          nome,
          telefone,
          origem: 'facebook_ads',
          status: 'novo',
          interesse: campanha ?? null,
          empreendimento_id,
          id_externo: leadId,
        })

        console.log(`Lead criado: ${nome} (${telefone}) — campanha: ${campanha ?? 'não identificada'}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('Erro no webhook Meta:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
