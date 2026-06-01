import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side apenas — para API Routes (Route Handlers)
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(list: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])) }
        catch {}
      },
    },
  })
}
