import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side (componentes React com 'use client')
export function createBrowserSupabase() {
  return createBrowserClient(url, anon)
}

// Admin client — apenas server-side (API routes)
export function createAdminSupabase() {
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
