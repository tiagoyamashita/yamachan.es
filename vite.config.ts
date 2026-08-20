import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { loadInstagramPosts } from './server/loadInstagramPosts.ts'
import { loadGoogleReviews } from './server/loadGoogleReviews.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

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
        },
      },
    ],
  }
})
