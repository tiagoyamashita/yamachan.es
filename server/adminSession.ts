import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'yamachan_admin'
const MAX_AGE_SEC = 60 * 60 * 24 * 7

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_WRITE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ''
  )
}

function expectedUsername(): string {
  return process.env.ADMIN_USERNAME || ''
}

function expectedPassword(): string {
  return process.env.ADMIN_PASSWORD || ''
}

function hmac(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url')
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

export function credentialsAreValid(username: string, password: string): boolean {
  const user = expectedUsername()
  const pass = expectedPassword()
  if (!user || !pass) {
    return false
  }
  return bytesEqual(username, user) && bytesEqual(password, pass)
}

export function signSession(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return `${payload}.${hmac(payload)}`
}

export function sessionIsValid(token: string | undefined): boolean {
  if (!token || !sessionSecret()) {
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
      typeof parsed.exp !== 'number'
    ) {
      return false
    }
    return parsed.exp > Date.now()
  } catch {
    return false
  }
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) {
    return undefined
  }
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === ADMIN_COOKIE) {
      return rest.join('=')
    }
  }
  return undefined
}

export function requestIsAuthed(request: Request): boolean {
  return sessionIsValid(readSessionCookie(request))
}

export function sessionCookie(token: string, secure: boolean): string {
  const attrs = [
    `${ADMIN_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SEC}`,
  ]
  if (secure) {
    attrs.push('Secure')
  }
  return attrs.join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  const attrs = [
    `${ADMIN_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure) {
    attrs.push('Secure')
  }
  return attrs.join('; ')
}

export function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url)
  if (url.protocol === 'https:') {
    return true
  }
  return request.headers.get('x-forwarded-proto') === 'https'
}
