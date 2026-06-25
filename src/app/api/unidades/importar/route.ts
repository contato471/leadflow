export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

// Mapa completo de siglas/nomes de abas para slugs do banco
const SIGLA_MAP: Record<string, string> = {
  // Mangabeira Ville
  'MV': 'MV', 'MANGABEIRA VILLE': 'MV', 'MANGABEIRA': 'MV',
  // Cidade dos Artistas
  'CDA': 'CDA', 'CIDADE DOS ARTISTAS': 'CDA',
  // Caminho das Árvores de Conceição da Feira (alias CDA)
  'CAMINHO DAS ARVORES CONCEICAO': 'CDA', 'CAMINHO DAS ARVORES DE CONCEICAO': 'CDA',
  // Vila Verde
  'VV': 'VV', 'VILA VERDE': 'VV',
  // Portal das Colinas
  'PDC': 'PDC', 'PORTAL DAS COLINAS': 'PDC',
  // Vale do Mirante
  'VM1': 'VM1', 'VALE DO MIRANTE 1': 'VM1', 'VALE DO MIRANTE': 'VM1',
  // Bom Sossego
  'BS': 'BS', 'BOM SOSSEGO': 'BS',
  // Bom Investimento
  'BI': 'BI', 'BOM INVESTIMENTO': 'BI',
  // Campo Aberto
  'CAC': 'CAC', 'CAMPO ABERTO': 'CAC',
  // Master Ville
  'MVE': 'MVE', 'MASTER VILLE': 'MVE',
  // Alta Vista — 1ª e 2ª etapa
  'AV1': 'AV1', 'AV 1ET': 'AV1', 'AV1ET': 'AV1', 'AV 1': 'AV1',
  'ALTA VISTA 1': 'AV1', 'ALTA VISTA 1ET': 'AV1', 'ALTA VISTA 1 ETAPA': 'AV1',
  'ALTA VISTA ETAPA 1': 'AV1', 'ALTA VISTA - 1 ETAPA': 'AV1',
  'AV2': 'AV2', 'AV 2ET': 'AV2', 'AV2ET': 'AV2', 'AV 2': 'AV2',
  'ALTA VISTA 2': 'AV2', 'ALTA VISTA 2ET': 'AV2', 'ALTA VISTA 2 ETAPA': 'AV2',
  'ALTA VISTA ETAPA 2': 'AV2', 'ALTA VISTA - 2 ETAPA': 'AV2',
  // Manter 'AV' sozinho como AV1 por retrocompatibilidade
  'AV': 'AV1', 'ALTA VISTA': 'AV1',
  // Recanto Real
  'RR': 'RR', 'RECANTO REAL': 'RR',
  // Nova Natureza
  'NN': 'NN', 'NOVA NATUREZA': 'NN',
  // Bom Viver Campo Formoso
  'BLC': 'BLC', 'BOM VIVER': 'BLC', 'BOM VIVER CAMPO FORMOSO': 'BLC',
}

function normalizarSigla(nome: string): string | null {
  // Remove acentos e normaliza
  const upper = nome.toUpperCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ªº°]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Match direto
  if (SIGLA_MAP[upper]) return SIGLA_MAP[upper]

  // Match com variações parciais
  for (const [key, val] of Object.entries(SIGLA_MAP)) {
    const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (upper === keyNorm || upper.startsWith(keyNorm + ' ') || upper.endsWith(' ' + keyNorm)) {
      return val
    }
  }
  return null
}

function parseMoeda(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseArea(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/[m²\s]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'adm') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const body = await req.json()
    const { base64, modoImportacao } = body

    const buffer = Buffer.from(base64, 'base64')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const admin = createAdminSupabase()

    // Buscar empreendimentos do banco
    const { data: empsDB } = await admin.from('empreendimentos').select('id, slug, nome')
    const empMap: Record<string, string> = {}
    empsDB?.forEach(e => {
      empMap[e.slug.toUpperCase()] = e.id
      // Normaliza nome também
      const nomeNorm = e.nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      empMap[nomeNorm] = e.id
    })

    const resultado = {
      processadas: 0,
      importadas: 0,
      atualizadas: 0,
      ignoradas: 0,
      erros: [] as string[],
      empreendimentos: [] as string[],
    }

    for (const sheetName of workbook.SheetNames) {
      const sigla = normalizarSigla(sheetName)
      if (!sigla) {
        resultado.erros.push(`Aba "${sheetName}": empreendimento não reconhecido (sigla detectada: nenhuma)`)
        continue
      }

      const empId = empMap[sigla]
      if (!empId) {
        resultado.erros.push(`Aba "${sheetName}" → sigla "${sigla}": não encontrado no banco de dados`)
        continue
      }

      resultado.empreendimentos.push(`${sheetName} → ${sigla}`)
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
      if (rows.length < 2) continue

      const headers = (rows[0] as string[]).map(h => String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())

      let colNome = headers.findIndex(h => h.includes('lote') || h.includes('unidade') || h === 'n' || h === 'no' || h === 'num')
      let colArea = headers.findIndex(h => h.includes('area') || h.includes('m2') || h.includes('m²') || h.includes('tamanho') || h.includes('medida'))
      let colValorM2 = headers.findIndex(h => (h.includes('valor') && h.includes('m')) || h.includes('preco/m') || h.includes('vl/m'))
      let colValorTotal = headers.findIndex(h => (h.includes('valor') && (h.includes('total') || h.includes('lote') || h.includes('venda') || h.includes('terreno'))) || (h.includes('total') && !h.includes('m')))
      let colStatus = headers.findIndex(h => h.includes('status') || h.includes('situacao') || h.includes('disponib'))
      let colQuadra = headers.findIndex(h => h.includes('quadra') || h === 'qd')

      if (colNome < 0) colNome = 0
      if (colArea < 0) colArea = 1
      if (colValorM2 < 0) colValorM2 = 2
      if (colValorTotal < 0) colValorTotal = 3

      if (modoImportacao === 'substituir') {
        await admin.from('unidades').delete().eq('empreendimento_id', empId)
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as unknown[]
        resultado.processadas++

        const nomeLoteRaw = String(row[colNome] ?? '').trim()
        const quadra = colQuadra >= 0 ? String(row[colQuadra] ?? '').trim() : ''

        // Monta nome completo incluindo quadra se disponível
        let nomeLote = nomeLoteRaw
        if (quadra && !nomeLoteRaw.toLowerCase().includes(quadra.toLowerCase())) {
          nomeLote = `Qd ${quadra} - ${nomeLoteRaw}`
        }

        if (!nomeLote || nomeLote === '' || ['total', 'subtotal', 'soma', '-'].includes(nomeLote.toLowerCase())) {
          resultado.ignoradas++
          continue
        }

        const area = parseArea(row[colArea])
        const valorTotal = parseMoeda(row[colValorTotal])
        const valorM2 = parseMoeda(row[colValorM2])
        const valorFinal = valorTotal ?? (area && valorM2 ? area * valorM2 : null)

        if (!valorFinal || valorFinal <= 0) {
          resultado.ignoradas++
          continue
        }

        let status: 'disponivel' | 'reservado' | 'vendido' = 'disponivel'
        if (colStatus >= 0 && row[colStatus]) {
          const s = String(row[colStatus]).toLowerCase()
          if (s.includes('reserv')) status = 'reservado'
          else if (s.includes('vend') || s.includes('negoc') || s.includes('vendid')) status = 'vendido'
        }

        const { data: existente } = await admin.from('unidades')
          .select('id').eq('empreendimento_id', empId).eq('nome', nomeLote).single()

        if (existente) {
          await admin.from('unidades').update({
            area_m2: area, valor_total: valorFinal, status,
            updated_at: new Date().toISOString(),
          }).eq('id', existente.id)
          resultado.atualizadas++
        } else {
          await admin.from('unidades').insert({
            empreendimento_id: empId, nome: nomeLote,
            area_m2: area, valor_total: valorFinal, status,
          })
          resultado.importadas++
        }
      }
    }

    return NextResponse.json(resultado)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao processar planilha' }, { status: 500 })
  }
}
