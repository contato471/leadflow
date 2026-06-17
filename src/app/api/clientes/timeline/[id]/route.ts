export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const admin = createAdminSupabase()
  // Só permite deletar notas criadas pelo próprio usuário ou se for adm
  const { data: entrada } = await admin.from('cliente_timeline').select('autor_id,tipo').eq('id', id).single()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (entrada?.autor_id !== user.id && profile?.role !== 'adm') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (entrada?.tipo !== 'nota') {
    return NextResponse.json({ error: 'Só é possível deletar notas manuais' }, { status: 400 })
  }
  await admin.from('cliente_timeline').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
