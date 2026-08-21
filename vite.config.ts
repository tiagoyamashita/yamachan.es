import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { loadInstagramPosts } from './server/loadInstagramPosts.ts'
import { loadGoogleReviews } from './server/loadGoogleReviews.ts'
import { handleAdminRequest } from './server/adminHttp.ts'
import { handleReservationsRequest } from './server/reservationsHttp.ts'
import { handleTakeoutRequest } from './server/takeoutHttp.ts'

async function nodeToWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost'
  const url = `http://${host}${req.url ?? '/'}`
  const method = req.method ?? 'GET'
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) {
      continue
    }
    if (Array.isArray(value)) {
      for (const part of value) {
        headers.append(key, part)
      }
    } else {
      headers.set(key, value)
    }
  }

  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)
  return new Request(url, {
    method,
    headers,
    body: body.length > 0 ? body : undefined,
  })
}

async function sendWebResponse(
  res: ServerResponse,
  response: Response,
) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    const current = res.getHeader(key)
    if (current === undefined) {
      res.setHeader(key, value)
      return
    }
    const list = Array.isArray(current) ? current : [String(current)]
    res.setHeader(key, [...list, value])
  })
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return {
    plugins: [
      react(),
      {
        name: 'instagram-api',
        configureServer(server) {
          server.middlewares.use(
            '/api/instagram',
            (req: IncomingMessage, res: ServerResponse, next: () => void) => {
              if (req.method && req.method !== 'GET') {
                next()
                return
              }

              void loadInstagramPosts(
                env.INSTAGRAM_ACCESS_TOKEN,
                env.INSTAGRAM_POST_URLS,
              )
                .then((posts) => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ posts }))
                })
                .catch(() => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ posts: [] }))
                })
            },
          )
          server.middlewares.use(
            '/api/google-reviews',
            (req: IncomingMessage, res: ServerResponse, next: () => void) => {
              if (req.method && req.method !== 'GET') {
                next()
                return
              }

              void loadGoogleReviews(
                env.GOOGLE_PLACES_API_KEY,
                env.GOOGLE_PLACE_ID,
              )
                .then((reviews) => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ reviews }))
                })
                .catch(() => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ reviews: [] }))
                })
            },
          )
          server.middlewares.use(
            (req: IncomingMessage, res: ServerResponse, next: () => void) => {
              const path = req.url?.split('?')[0] ?? ''
              if (
                !path.startsWith('/api/admin') &&
                !path.startsWith('/api/reservations') &&
                !path.startsWith('/api/takeout')
              ) {
                next()
                return
              }

              let handle = handleAdminRequest
              if (path.startsWith('/api/reservations')) {
                handle = handleReservationsRequest
              } else if (path.startsWith('/api/takeout')) {
                handle = handleTakeoutRequest
              }

              void nodeToWebRequest(req)
                .then((request) => handle(request))
                .then((response) => sendWebResponse(res, response))
                .catch(() => {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'error' }))
                })
            },
          )
        },
      },
    ],
  }
})
