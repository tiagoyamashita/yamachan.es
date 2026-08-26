import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  companyInfoToRow,
  fallbackCompanyInfo,
  parseStoredCompanyInfo,
  type StoredCompanyInfo,
} from '../src/companyInfo.ts'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'

function getAdminSupabase(): SupabaseClient | null {
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

export async function getAdminCompanyInfo(): Promise<StoredCompanyInfo> {
  const secret = adminWriteSecret()
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
  const secret = adminWriteSecret()
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
