import { restaurant } from '../src/content.ts'
import { expectedAdminEmail } from './adminSettings.ts'
import { getResendClient } from './resendClient.ts'

function resendFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `${restaurant.name} <onboarding@resend.dev>`
  )
}

export async function passwordResetEmailConfigured(): Promise<boolean> {
  return Boolean(await expectedAdminEmail() && getResendClient())
}

function passwordResetSubject(): string {
  return `${restaurant.name} — restablecer contraseña de admin`
}

function passwordResetText(resetUrl: string): string {
  return [
    'Hola,',
    '',
    `Has pedido restablecer la contraseña del panel de admin de ${restaurant.name}.`,
    '',
    `Elige una contraseña nueva: ${resetUrl}`,
    '',
    'Este enlace caduca en una hora. Si no lo pediste, puedes ignorar este correo.',
  ].join('\n')
}

function passwordResetHtml(resetUrl: string): string {
  const safeName = escapeHtml(restaurant.name)
  const safeUrl = escapeHtml(resetUrl)

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f4ef;color:#1f1a17;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:32px;background:#ffffff;border:1px solid #e7dfd4;border-radius:12px;">
          <p style="margin:0 0 16px;font-size:18px;font-weight:700;">${safeName}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hola,</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
            Has pedido restablecer la contraseña del panel de admin de ${safeName}.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#8b1e1e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;">
              Elegir contraseña nueva
            </a>
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#5c524c;">
            Este enlace caduca en una hora. Si no lo pediste, puedes ignorar este correo.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a7069;word-break:break-all;">
            ${safeUrl}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export async function sendPasswordResetEmail(
  resetUrl: string,
): Promise<void> {
  const resend = getResendClient()
  const to = await expectedAdminEmail()
  if (!resend || !to) {
    throw new Error('missing-mail-config')
  }

  const { error } = await resend.emails.send({
    from: resendFrom(),
    to: [to],
    subject: passwordResetSubject(),
    html: passwordResetHtml(resetUrl),
    text: passwordResetText(resetUrl),
  })

  if (error) {
    throw new Error('mail-send-failed')
  }
}
