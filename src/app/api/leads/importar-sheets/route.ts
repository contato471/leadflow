export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY ?? 'AIzaSyD7OwcBbGZ81ALULT3CXn8YLCRIp7VwTBw'
const SPREADSHEET_ID = '15Hh_YVbQN-RlBBoYItjwUHCPyMdWmUhOXBnxGJstrI0'

function limparTelefone(tel: string): string | null {
  if (!tel) return null
  const limpo = tel.toString().replace(/\D/g, '')
  const semPais = limpo.startsWith('55') && limpo.length >= 12 ? limpo.slice(2) : limpo
  if (semPais.length === 11 && semPais[2] === '9') return semPais
  if (semPais.length === 10) return semPais.slice(0,2) + '9' + semPais.slice(2)
  return null
}

function limparNome(nome: string): string {
  const n = (nome ?? '').toString().trim()
  if (!n || n.length < 2) return 'Sem nome'
  const primeiro = n.split(' ')[0]
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
}

function mapOrigem(origem: string): string {
  const o = (origem ?? '').toLowerCase()
  if (o.includes('face') || o.includes('fb') || o.includes('meta')) return 'facebook_ads'
  if (o.includes('olx')) return 'olx'
  if (o.includes('chave') || o.includes('imovel')) return 'chaves_na_mao'
  if (o.includes('liga')) return 'ligacao'
  if (o.includes('flux') || o.includes('walk')) return 'fluxo'
  if (o.includes('trello') || o.includes('balzan')) return 'trello'
  return 'outro'
}

async function lerAba(abaName: string): Promise<string[][]> {
  const encoded = encodeURIComponent(abaName)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encoded}?key=${SHEETS_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(`Aba "${abaName}": ${data.error.message}`)
  return data.values ?? []
}

type LeadImportado = { nome: string; telefone: string; origem: string; aba: string }

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminSupabase()
  let importados = 0, ignorados = 0, duplicados = 0
  const erros: string[] = []
  const leadsImportados: LeadImportado[] = []

  // ── Leads Geral ──
  // DATA | NOME | INTERESSE | NÚMERO | ORIGEM | CORRETOR | ÚLTIMA INTERAÇÃO
  try {
    const rows = await lerAba('Leads Geral')
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const corretor = (row[5] ?? '').toString().trim()
      if (corretor) { ignorados++; continue }
      const telefone = limparTelefone(row[3])
      if (!telefone) { ignorados++; continue }
      const { data: existe } = await admin.from('leads').select('id').eq('telefone', telefone).single()
      if (existe) { duplicados++; continue }
      const nome = limparNome(row[1]) || 'Sem nome'
      const origem = mapOrigem(row[4])
      await admin.from('leads').insert({
        nome, telefone, origem, interesse: (row[2] || null), status: 'novo',
      })
      leadsImportados.push({ nome, telefone, origem, aba: 'Leads Geral' })
      importados++
    }
  } catch (e: any) { erros.push(e.message) }

  // ── Leads CBII ──
  // DATA | NOME | INTERESSE | NÚMERO | ORIGEM | CORRETOR | ÚLTIMA INTERAÇÃO
  try {
    const rows = await lerAba('Leads CBII')
    const { data: empCB } = await admin.from('empreendimentos').select('id').eq('slug','BLC').single()
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const corretor = (row[5] ?? '').toString().trim()
      if (corretor) { ignorados++; continue }
      const telefone = limparTelefone(row[3])
      if (!telefone) { ignorados++; continue }
      const { data: existe } = await admin.from('leads').select('id').eq('telefone', telefone).single()
      if (existe) { duplicados++; continue }
      const nome = limparNome(row[1]) || 'Sem nome'
      const origem = mapOrigem(row[4])
      await admin.from('leads').insert({
        nome, telefone, origem, interesse: (row[2] || null), status: 'novo',
        empreendimento_id: empCB?.id ?? null,
      })
      leadsImportados.push({ nome, telefone, origem, aba: 'Leads CBII' })
      importados++
    }
  } catch (e: any) { erros.push(e.message) }

  // ── Leads Balzani ──
  // Data e Hora | Nome | Cli | Loteamento | Telefone | Card ID | Corretor | Envio
  try {
    const rows = await lerAba('Leads Balzani')
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const corretor = (row[6] ?? '').toString().trim()
      if (corretor) { ignorados++; continue }
      const telefone = limparTelefone(row[4])
      if (!telefone) { ignorados++; continue }
      const { data: existe } = await admin.from('leads').select('id').eq('telefone', telefone).single()
      if (existe) { duplicados++; continue }
      const loteamento = (row[3] ?? '').toString()
      let empId: string | null = null
      if (loteamento) {
        const slugs = ['MV','CDA','VV','PDC','VM1','BS','BI','CAC','MVE','AV1','AV2','RR','NN','BLC']
        const s = slugs.find(x => loteamento.toUpperCase().includes(x))
        if (s) {
          const { data: emp } = await admin.from('empreendimentos').select('id').eq('slug', s).single()
          empId = emp?.id ?? null
        }
      }
      const nome = limparNome(row[1]) || 'Sem nome'
      await admin.from('leads').insert({
        nome, telefone, origem: 'trello',
        interesse: loteamento || null, status: 'novo', empreendimento_id: empId,
      })
      leadsImportados.push({ nome, telefone, origem: 'trello', aba: 'Leads Balzani' })
      importados++
    }
  } catch (e: any) { erros.push(e.message) }

  return NextResponse.json({ importados, ignorados, duplicados, erros, leadsImportados })
}
