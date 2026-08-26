import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
  envTrim,
} from './adminEnv.ts'

function getSupabase(): SupabaseClient | null {
  const url = adminSupabaseUrl()
  const key = adminSupabaseKey()
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

export async function expectedAdminEmail(): Promise<string> {
  const stored = await storedAdminEmail()
  if (stored) {
    return stored
  }
  return envTrim('ADMIN_EMAIL')
}

export async function setStoredAdminEmail(email: string): Promise<void> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { error } = await supabase.rpc('yamachan_admin_set_reset_email', {
    p_secret: secret,
    p_email: email,
  })
  if (error) {
    throw new Error(error.message)
  }
}
