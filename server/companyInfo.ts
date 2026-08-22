import { createClient } from '@supabase/supabase-js'
import {
  fallbackCompanyInfo,
  parseStoredCompanyInfo,
  type StoredCompanyInfo,
} from '../src/companyInfo.ts'

export async function loadCompanyInfo(): Promise<StoredCompanyInfo> {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  if (!url || !key) {
    return fallbackCompanyInfo()
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await supabase
    .from('yamachan_company_info')
    .select(
      'phone, phone_display, address_lines, neighborhood, hours_note, hours, open_weekdays, lunch_open, lunch_close',
    )
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) {
    return fallbackCompanyInfo()
  }
  return parseStoredCompanyInfo(data) ?? fallbackCompanyInfo()
}
