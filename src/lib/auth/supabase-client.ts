import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client for build/dev without Supabase configured
    if (!browserClient) {
      browserClient = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
    }
    return browserClient
  }
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

export function createSupabaseServerClient(serviceRoleKey?: string) {
  if (!supabaseUrl) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }
  return createClient(
    supabaseUrl,
    serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  )
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}
