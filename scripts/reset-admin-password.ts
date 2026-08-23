import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from './load-env.ts'

loadEnvFile()

function usage(): never {
  console.error(`Usage:
  npm run admin:reset-password -- <new-password>
  npm run admin:reset-password -- --clear

  <new-password> must be at least 8 characters.
  --clear removes the stored hash so ADMIN_PASSWORD from .env is used again.`)
  process.exit(1)
}

async function clearStoredPassword(): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  const writeSecret = process.env.ADMIN_WRITE_SECRET?.trim() || ''

  if (!url || !key || !writeSecret) {
    throw new Error(
      'Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, or ADMIN_WRITE_SECRET in .env',
    )
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { error } = await supabase.rpc('yamachan_admin_clear_password_hash', {
    p_secret: writeSecret,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function setStoredPassword(password: string): Promise<void> {
  const { setStoredAdminPassword } = await import('../server/adminPassword.ts')
  await setStoredAdminPassword(password)
}

async function main(): Promise<void> {
  const arg = process.argv[2]
  if (!arg) {
    usage()
  }

  if (arg === '--clear') {
    await clearStoredPassword()
    console.log(
      'Stored admin password hash removed. Sign in with ADMIN_PASSWORD from .env.',
    )
    return
  }

  const password = arg.trim()
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  await setStoredPassword(password)
  console.log('Admin password updated. Sign in with your new password.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed: ${message}`)
  if (message.includes('admin-write-secret-not-configured')) {
    console.error(
      'Run supabase/setup-admin.sql in the Supabase SQL editor first (seed admin_write_secret).',
    )
  }
  process.exit(1)
})
