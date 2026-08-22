import { useEffect, useState } from 'react'
import {
  fallbackCompanyInfo,
  parseStoredCompanyInfo,
  type StoredCompanyInfo,
} from './companyInfo.ts'
import { getSupabase } from './supabase.ts'

export function useCompanyInfo() {
  const client = getSupabase()
  const [info, setInfo] = useState<StoredCompanyInfo | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!client) {
        setInfo(fallbackCompanyInfo())
        return
      }

      const { data, error } = await client
        .from('yamachan_company_info')
        .select(
          'phone, phone_display, address_lines, neighborhood, hours_note, hours, open_weekdays, lunch_open, lunch_close',
        )
        .eq('id', 'default')
        .maybeSingle()

      if (cancelled) {
        return
      }
      if (error || !data) {
        setInfo(fallbackCompanyInfo())
        return
      }
      setInfo(parseStoredCompanyInfo(data) ?? fallbackCompanyInfo())
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  return info
}
