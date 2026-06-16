export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { base64, mimeType, fileName } = body

  // Remove o prefixo data:image/...;base64,
  const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const admin = createAdminSupabase()
  const path = `avatars/${user.id}/${Date.now()}_${fileName}`

  const { error } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (error) {
    // Se o bucket não existe, salva como data URL diretamente na tabela
    const dataUrl = base64
    await admin.from('users').update({ avatar_url: dataUrl }).eq('id', user.id)
    return NextResponse.json({ url: dataUrl })
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path)
  await admin.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
  return NextResponse.json({ url: urlData.publicUrl })
}
