import { restaurant } from '../src/content.ts'

function adminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || ''
}

function resendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() || ''
}

function resendFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `${restaurant.name} <onboarding@resend.dev>`
  )
}

export function passwordResetEmailConfigured(): boolean {
  return Boolean(adminEmail() && resendApiKey())
}

export async function sendPasswordResetEmail(
  resetUrl: string,
): Promise<void> {
  const apiKey = resendApiKey()
  const to = adminEmail()
  if (!apiKey || !to) {
    throw new Error('missing-mail-config')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom(),
      to: [to],
      subject: `${restaurant.name} — restablecer contraseña de admin`,
      html: `
        <p>Hola,</p>
        <p>Has pedido restablecer la contraseña del panel de admin de ${restaurant.name}.</p>
        <p><a href="${resetUrl}">Elige una contraseña nueva</a></p>
        <p>Este enlace caduca en una hora. Si no lo pediste, puedes ignorar este correo.</p>
      `,
    }),
  })

  if (!response.ok) {
    throw new Error('mail-send-failed')
  }
}
