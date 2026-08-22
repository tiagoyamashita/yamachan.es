import { createHmac, timingSafeEqual } from 'node:crypto'

const RESET_MAX_AGE_MS = 60 * 60 * 1000

function resetSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_WRITE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ''
  )
}

function bytesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

function hmac(value: string): string {
  return createHmac('sha256', resetSecret()).update(value).digest('base64url')
}

export function signPasswordResetToken(): string | null {
  if (!resetSecret()) {
    return null
  }
  const exp = Date.now() + RESET_MAX_AGE_MS
  const payload = Buffer.from(
    JSON.stringify({ exp, purpose: 'admin-reset' }),
  ).toString('base64url')
  return `${payload}.${hmac(payload)}`
}

export function passwordResetTokenIsValid(token: string | undefined): boolean {
  if (!token || !resetSecret()) {
    return false
  }
  const dot = token.lastIndexOf('.')
  if (dot <= 0) {
    return false
  }
  const payload = token.slice(0, dot)
  const mac = token.slice(dot + 1)
  if (!bytesEqual(hmac(payload), mac)) {
    return false
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    )
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('exp' in parsed) ||
      typeof parsed.exp !== 'number' ||
      !('purpose' in parsed) ||
      parsed.purpose !== 'admin-reset'
    ) {
      return false
    }
    return parsed.exp > Date.now()
  } catch {
    return false
  }
}
