export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

// Mapa de abreviações para slugs dos empreendimentos
const SIGLA_MAP: Record<string, string> = {
  'MV': 'MV', 'MANGABEIRA': 'MV', 'MANGABEIRA VILLE': 'MV',
  'CDA': 'CDA', 'CIDADE DOS ARTISTAS': 'CDA',
  'VV': 'VV', 'VILA VERDE': 'VV',
  'PDC': 'PDC', 'PORTAL DAS COLINAS': 'PDC',
  'VM1': 'VM1', 'VALE DO MIRANTE': 'VM1', 'VALE DO MIRANTE 1': 'VM1',
  'BS': 'BS', 'BOM SOSSEGO': 'BS',
  'BI': 'BI', 'BOM INVESTIMENTO': 'BI',
  'CAC': 'CAC', 'CAMPO ABERTO': 'CAC',
  'MVE': 'MVE', 'MASTER VILLE': 'MVE',
  'AV': 'AV', 'ALTA VISTA': 'AV',
  'RR': 'RR', 'RECANTO REAL': 'RR',
  'NN': 'NN', 'NOVA NATUREZA': 'NN',
  'BLC': 'BLC', 'BOM VIVER': 'BLC', 'BOM VIVER CAMPO FORMOSO': 'BLC',
}

function normalizarSigla(nome: string): string | null {
  const upper = nome.toUpperCase().trim()
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Tenta match direto
  if (SIGLA_MAP[upper]) return SIGLA_MAP[upper]
  // Tenta match parcial
  for (const [key, val] of Object.entries(SIGLA_MAP)) {
    if (upper.startsWith(key) || upper.includes(key)) return val
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
    const { base64, modoImportacao } = body // modoImportacao: 'atualizar' | 'substituir'

    const buffer = Buffer.from(base64, 'base64')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const admin = createAdminSupabase()

    // Buscar empreendimentos do banco
    const { data: empsDB } = await admin.from('empreendimentos').select('id, slug, nome')
    const empMap: Record<string, string> = {}
    empsDB?.forEach(e => {
      empMap[e.slug.toUpperCase()] = e.id
      empMap[e.nome.toUpperCase()] = e.id
    })

    const resultado = {
      processadas: 0,
      importadas: 0,
      atualizadas: 0,
      ignoradas: 0,
      erros: [] as string[],
      empreendimentos: [] as string[],
    }

    // Processar cada aba do Excel
    for (const sheetName of workbook.SheetNames) {
      const sigla = normalizarSigla(sheetName)
      if (!sigla) {
        resultado.erros.push(`Aba "${sheetName}": empreendimento não reconhecido`)
        continue
      }

      const empId = empMap[sigla] || empMap[Object.keys(empMap).find(k => k.includes(sigla)) ?? '']
      if (!empId) {
        resultado.erros.push(`Aba "${sheetName}" (${sigla}): empreendimento não encontrado no banco`)
        continue
      }

      resultado.empreendimentos.push(sheetName)
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

      if (rows.length < 2) continue

      // Detectar cabeçalhos na primeira linha
      const headers = (rows[0] as string[]).map(h => String(h).toLowerCase().trim())

      // Tentar identificar colunas por nome
      let colNome = headers.findIndex(h => h.includes('lote') || h.includes('unidade') || h.includes('quadra') || h === 'n' || h === 'no')
      let colArea = headers.findIndex(h => h.includes('area') || h.includes('área') || h.includes('m²') || h.includes('m2') || h.includes('tamanho'))
      let colValorM2 = headers.findIndex(h => (h.includes('valor') && h.includes('m')) || h.includes('preço/m') || h.includes('preco/m'))
      let colValorTotal = headers.findIndex(h => (h.includes('valor') && (h.includes('total') || h.includes('lote') || h.includes('venda'))) || (h.includes('total') && !h.includes('m²')))
      let colStatus = headers.findIndex(h => h.includes('status') || h.includes('situacao') || h.includes('situação') || h.includes('disponib'))

      // Se não encontrou por nome, usar posições padrão (A=nome, B=área, C=valor/m², D=valor total)
      if (colNome < 0) colNome = 0
      if (colArea < 0) colArea = 1
      if (colValorM2 < 0) colValorM2 = 2
      if (colValorTotal < 0) colValorTotal = 3

      // Se modo substituir, apaga unidades do empreendimento primeiro
      if (modoImportacao === 'substituir') {
        await admin.from('unidades').delete().eq('empreendimento_id', empId)
      }

      // Processar linhas de dados
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as unknown[]
        resultado.processadas++

        const nomeLote = String(row[colNome] ?? '').trim()
        if (!nomeLote || nomeLote === '' || nomeLote.toLowerCase() === 'total' || nomeLote.toLowerCase() === 'subtotal') {
          resultado.ignoradas++
          continue
        }

        const area = parseArea(row[colArea])
        const valorTotal = parseMoeda(row[colValorTotal])
        const valorM2 = parseMoeda(row[colValorM2])

        // Calcular valor total se não tiver direto
        const valorFinal = valorTotal ?? (area && valorM2 ? area * valorM2 : null)

        if (!valorFinal || valorFinal <= 0) {
          resultado.ignoradas++
          resultado.erros.push(`Aba "${sheetName}" linha ${i + 1}: "${nomeLote}" sem valor total calculável`)
          continue
        }

        // Detectar status
        let status: 'disponivel' | 'reservado' | 'vendido' = 'disponivel'
        if (colStatus >= 0 && row[colStatus]) {
          const s = String(row[colStatus]).toLowerCase()
          if (s.includes('reserv')) status = 'reservado'
          else if (s.includes('vend') || s.includes('negoc')) status = 'vendido'
        }

        // Verificar se já existe (por nome + empreendimento)
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
