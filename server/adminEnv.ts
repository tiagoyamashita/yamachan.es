/** Shared admin env helpers — always trim to survive Vercel/CI trailing newlines. */

export function envTrim(name: string): string {
  return (process.env[name] || '').trim()
}

export function adminWriteSecret(): string {
  return envTrim('ADMIN_WRITE_SECRET')
}

export function adminSessionSecret(): string {
  return (
    envTrim('ADMIN_SESSION_SECRET') ||
    envTrim('ADMIN_WRITE_SECRET') ||
    envTrim('ADMIN_PASSWORD')
  )
}

export function adminSupabaseUrl(): string {
  return envTrim('SUPABASE_URL') || envTrim('VITE_SUPABASE_URL')
}

export function adminSupabaseKey(): string {
  return (
    envTrim('SUPABASE_PUBLISHABLE_KEY') ||
    envTrim('VITE_SUPABASE_PUBLISHABLE_KEY')
  )
}
