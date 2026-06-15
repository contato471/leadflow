export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { syncGoogleSheets, syncTrello, distribuirLeadsPendentes } from '@/lib/sync'
import { createAdminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const resultados = []

  try {
    const sheets = await syncGoogleSheets()
    await supabase.from('sync_log').insert({
      fonte: 'google_sheets', leads_novos: sheets.novos, leads_ignorados: sheets.ignorados,
      status: sheets.erros.length > 0 ? (sheets.novos > 0 ? 'parcial' : 'erro') : 'sucesso',
      erro_mensagem: sheets.erros.join('\n') || null,
    })
    resultados.push({ fonte: 'google_sheets', ...sheets })
  } catch (err) { resultados.push({ fonte: 'google_sheets', erro: String(err) }) }

  try {
    const trello = await syncTrello()
    await supabase.from('sync_log').insert({
      fonte: 'trello', leads_novos: trello.novos, leads_ignorados: trello.ignorados,
      status: trello.erros.length > 0 ? (trello.novos > 0 ? 'parcial' : 'erro') : 'sucesso',
      erro_mensagem: trello.erros.join('\n') || null,
    })
    resultados.push({ fonte: 'trello', ...trello })
  } catch (err) { resultados.push({ fonte: 'trello', erro: String(err) }) }

  const distribuidos = await distribuirLeadsPendentes()
  return NextResponse.json({ ok: true, distribuidos, resultados, timestamp: new Date().toISOString() })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const supabase = createAdminSupabase()
  const { data } = await supabase.from('sync_log').select('*').order('executado_em', { ascending: false }).limit(10)
  return NextResponse.json({ logs: data })
}
