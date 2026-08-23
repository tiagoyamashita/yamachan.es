import { loadEnvFile } from './load-env.ts'

loadEnvFile()

let cookie = ''

async function check(path: string, init?: RequestInit): Promise<void> {
  const headers = new Headers(init?.headers)
  if (cookie) {
    headers.set('cookie', cookie)
  }
  const response = await fetch(`http://localhost:5173${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })
  const setCookie = response.headers.getSetCookie?.() ?? []
  if (setCookie.length > 0) {
    cookie = setCookie.map((part) => part.split(';')[0]).join('; ')
  }
  const body = await response.text()
  console.log(`${init?.method ?? 'GET'} ${path} → ${response.status} ${body.slice(0, 200)}`)
}

const username = process.env.ADMIN_USERNAME?.trim() || ''
const password = process.env.ADMIN_PASSWORD || ''

if (!username || !password) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env')
  process.exit(1)
}

await check('/api/admin/session')
await check('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
})
await check('/api/admin/session')
await check('/api/admin/company')
await check('/api/admin/menu')
