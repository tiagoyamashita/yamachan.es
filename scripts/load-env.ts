import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function loadEnvFile(filename = '.env'): void {
  const filePath = path.join(root, filename)
  if (!fs.existsSync(filePath)) {
    return
  }
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const index = trimmed.indexOf('=')
    if (index <= 0) {
      continue
    }
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
