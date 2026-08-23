import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function storedSetting(
  rpc: 'yamachan_admin_reset_email' | 'yamachan_admin_username',
): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) {
    return ''
  }
  const { data, error } = await supabase.rpc(rpc)
  if (error || typeof data !== 'string') {
    return ''
  }
  return data.trim()
}

export async function storedAdminEmail(): Promise<string> {
  return storedSetting('yamachan_admin_reset_email')
}

export async function storedAdminUsername(): Promise<string> {
  return storedSetting('yamachan_admin_username')
}
