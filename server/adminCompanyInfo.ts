import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  companyInfoToRow,
  fallbackCompanyInfo,
  parseStoredCompanyInfo,
  type StoredCompanyInfo,
} from '../src/companyInfo.ts'

function writeSecret(): string {
  return process.env.ADMIN_WRITE_SECRET || ''
}

function getAdminSupabase(): SupabaseClient | null {
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

export async function getAdminCompanyInfo(): Promise<StoredCompanyInfo> {
  const secret = writeSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { data, error } = await supabase.rpc('yamachan_admin_get_company_info', {
    p_secret: secret,
  })
  if (error) {
    throw new Error(error.message)
  }
  const parsed = parseStoredCompanyInfo(data)
  return parsed ?? fallbackCompanyInfo()
}

export async function upsertAdminCompanyInfo(
  info: StoredCompanyInfo,
): Promise<StoredCompanyInfo> {
  const secret = writeSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { data, error } = await supabase.rpc('yamachan_admin_upsert_company_info', {
    p_secret: secret,
    p_info: companyInfoToRow(info),
  })
  if (error) {
    throw new Error(error.message)
  }
  const saved = parseStoredCompanyInfo(data)
  if (!saved) {
    throw new Error('invalid-company-info')
  }
  return saved
}
