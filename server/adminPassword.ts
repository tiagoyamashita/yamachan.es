import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function writeSecret(): string {
  return process.env.ADMIN_WRITE_SECRET || ''
}

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

export async function adminHasStoredPassword(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) {
    return false
  }
  const { data, error } = await supabase.rpc('yamachan_admin_has_password_hash')
  if (error) {
    return false
  }
  return data === true
}

export async function verifyStoredAdminPassword(
  password: string,
): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !password) {
    return false
  }
  const { data, error } = await supabase.rpc('yamachan_verify_admin_password', {
    p_password: password,
  })
  if (error) {
    return false
  }
  return data === true
}

export async function setStoredAdminPassword(password: string): Promise<void> {
  const secret = writeSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { error } = await supabase.rpc('yamachan_admin_set_password_hash', {
    p_secret: secret,
    p_password: password,
  })
  if (error) {
    throw new Error(error.message)
  }
}
