import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { loadInstagramPosts } from './server/loadInstagramPosts.ts'
import { fetchInstagramMedia } from './server/instagramEmbed.ts'
import { loadInstagramPermalinkPreview } from './server/instagramPreview.ts'
import { loadGoogleReviews } from './server/loadGoogleReviews.ts'
import { handleAdminRequest } from './server/adminHttp.ts'
import { handleReservationsRequest } from './server/reservationsHttp.ts'
import { handleTakeoutRequest } from './server/takeoutHttp.ts'
import { handleTableOrderRequest } from './server/tableOrderHttp.ts'

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
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      hmr: {
        host: 'localhost',
        port: 5173,
        clientPort: 5173,
      },
    },
    plugins: [
      react(),
      legacy({
        targets: ['android >= 4.4', 'chrome >= 49', 'samsung >= 4', 'ios >= 9'],
        additionalLegacyPolyfills: [
          'whatwg-fetch',
          'core-js/proposals/global-this',
        ],
      }),
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

              const mountedPath = req.url?.split('?')[0] ?? '/'
              if (
                mountedPath === '/preview' ||
                mountedPath.startsWith('/preview/')
              ) {
                const permalink = new URL(
                  req.url ?? '/',
                  'http://localhost',
                ).searchParams.get('url')
                if (!permalink) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing url' }))
                  return
                }
                void loadInstagramPermalinkPreview(permalink)
                  .then((preview) => {
                    res.setHeader('Content-Type', 'application/json')
                    if (!preview) {
                      res.statusCode = 404
                      res.end(JSON.stringify({ error: 'Not found' }))
                      return
                    }
                    res.end(JSON.stringify(preview))
                  })
                  .catch(() => {
                    res.statusCode = 502
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Upstream error' }))
                  })
                return
              }

              if (mountedPath === '/media' || mountedPath.startsWith('/media/')) {
                const mediaUrl = new URL(
                  req.url ?? '/',
                  'http://localhost',
                ).searchParams.get('url')
                if (!mediaUrl) {
                  res.statusCode = 400
                  res.end('Missing url')
                  return
                }
                const incomingHeaders = new Headers()
                if (typeof req.headers.range === 'string') {
                  incomingHeaders.set('Range', req.headers.range)
                }
                const incoming = new Request(`http://localhost${req.url ?? '/'}`, {
                  headers: incomingHeaders,
                })
                void fetchInstagramMedia(mediaUrl, incoming)
                  .then((media) => {
                    if (!media) {
                      res.statusCode = 404
                      res.end('Not found')
                      return
                    }
                    return sendWebResponse(res, media)
                  })
                  .catch(() => {
                    res.statusCode = 502
                    res.end('Upstream error')
                  })
                return
              }

              void loadInstagramPosts()
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
                !path.startsWith('/api/takeout') &&
                !path.startsWith('/api/mesa')
              ) {
                next()
                return
              }

              let handle = handleAdminRequest
              if (path.startsWith('/api/reservations')) {
                handle = handleReservationsRequest
              } else if (path.startsWith('/api/takeout')) {
                handle = handleTakeoutRequest
              } else if (path.startsWith('/api/mesa')) {
                handle = handleTableOrderRequest
              }

              void nodeToWebRequest(req)
                .then((request) => handle(request))
                .then((response) => sendWebResponse(res, response))
                .catch((error: unknown) => {
                  const message =
                    error instanceof Error ? error.message : 'error'
                  console.error(`[api] ${path} failed:`, error)
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: message }))
                })
            },
          )
        },
      },
    ],
  }
})
