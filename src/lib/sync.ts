import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import { createAdminSupabase } from './supabase'
import type { LeadOrigem } from '@/types'

const COLUNAS = { id: 'ID', nome: 'Nome', telefone: 'Telefone', interesse: 'Interesse', empreendimento: 'Empreendimento', origem: 'Origem' }

function parseOrigem(raw: string): LeadOrigem {
  const m: Record<string, LeadOrigem> = {
    'olx': 'olx', 'chaves na mão': 'chaves_na_mao', 'chaves': 'chaves_na_mao',
    'facebook': 'facebook_ads', 'facebook ads': 'facebook_ads',
    'ligação': 'ligacao', 'ligacao': 'ligacao', 'fluxo': 'fluxo',
  }
  return m[raw?.toLowerCase()?.trim()] ?? 'outro'
}

function limparTel(tel: string) { return tel?.replace(/\D/g, '') ?? '' }

async function getEmpMap() {
  const supabase = createAdminSupabase()
  const { data } = await supabase.from('empreendimentos').select('id, slug, nome')
  const map: Record<string, string> = {}
  data?.forEach(e => { map[e.slug.toLowerCase()] = e.id; map[e.nome.toLowerCase()] = e.id })
  return map
}

export async function syncGoogleSheets() {
  let novos = 0, ignorados = 0
  const erros: string[] = []
  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, auth)
    await doc.loadInfo()
    const sheet = doc.sheetsByTitle[process.env.GOOGLE_SHEET_NAME ?? 'Leads']
    if (!sheet) throw new Error('Aba não encontrada')
    const rows = await sheet.getRows()
    const empMap = await getEmpMap()
    const supabase = createAdminSupabase()
    for (const row of rows) {
      const idExterno = row.get(COLUNAS.id)?.toString()?.trim()
      const nome = row.get(COLUNAS.nome)?.toString()?.trim()
      const telefone = limparTel(row.get(COLUNAS.telefone)?.toString())
      if (!nome || !telefone || !idExterno) { ignorados++; continue }
      const empRaw = row.get(COLUNAS.empreendimento)?.toString()?.toLowerCase()?.trim()
      const { error } = await supabase.from('leads').upsert({
        id_externo: idExterno, nome, telefone,
        origem: parseOrigem(row.get(COLUNAS.origem)?.toString()),
        interesse: row.get(COLUNAS.interesse)?.toString()?.trim() ?? null,
        empreendimento_id: empRaw ? (empMap[empRaw] ?? null) : null,
        status: 'novo',
      }, { onConflict: 'id_externo,origem', ignoreDuplicates: true })
      if (error) { erros.push(`${idExterno}: ${error.message}`); ignorados++ } else novos++
    }
  } catch (err) {
    erros.push(err instanceof Error ? err.message : 'Erro Sheets')
  }
  return { novos, ignorados, erros }
}

export async function syncTrello() {
  let novos = 0, ignorados = 0
  const erros: string[] = []
  try {
    const { key, token, boardId } = { key: process.env.TRELLO_API_KEY, token: process.env.TRELLO_TOKEN, boardId: process.env.TRELLO_BOARD_ID }
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${key}&token=${token}&fields=id,name,desc`)
    if (!res.ok) throw new Error(`Trello: ${res.statusText}`)
    const cards = await res.json()
    const empMap = await getEmpMap()
    const supabase = createAdminSupabase()
    for (const card of cards) {
      const partes = card.name?.split('|')
      const nome = partes?.[0]?.trim()
      const telefone = limparTel(partes?.[1] ?? '')
      if (!nome || !telefone) { ignorados++; continue }
      const desc = card.desc ?? ''
      const empMatch = desc.match(/Empreendimento:\s*(.+)/i)
      const intMatch = desc.match(/Interesse:\s*(.+)/i)
      const empRaw = empMatch?.[1]?.toLowerCase()?.trim()
      const { error } = await supabase.from('leads').upsert({
        id_externo: card.id, nome, telefone, origem: 'trello' as LeadOrigem,
        interesse: intMatch?.[1]?.trim() ?? null,
        empreendimento_id: empRaw ? (empMap[empRaw] ?? null) : null,
        status: 'novo',
      }, { onConflict: 'id_externo,origem', ignoreDuplicates: true })
      if (error) { erros.push(`${card.id}: ${error.message}`); ignorados++ } else novos++
    }
  } catch (err) {
    erros.push(err instanceof Error ? err.message : 'Erro Trello')
  }
  return { novos, ignorados, erros }
}

export async function distribuirLeadsPendentes() {
  const supabase = createAdminSupabase()
  const { data: leads } = await supabase
    .from('leads').select('id').eq('status', 'novo').is('corretor_id', null).not('empreendimento_id', 'is', null)
  if (!leads?.length) return 0
  let distribuidos = 0
  for (const lead of leads) {
    const { error } = await supabase.rpc('distribuir_lead', { p_lead_id: lead.id })
    if (!error) distribuidos++
  }
  return distribuidos
}
