import { Resend } from 'resend'

let client: Resend | null | undefined

export function getResendClient(): Resend | null {
  if (client !== undefined) {
    return client
  }
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    client = null
    return client
  }
  client = new Resend(key)
  return client
}
