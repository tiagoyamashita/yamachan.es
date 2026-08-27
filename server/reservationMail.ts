import { restaurant } from '../src/content.ts'
import { getResendClient } from './resendClient.ts'

function resendFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    `${restaurant.name} <onboarding@resend.dev>`
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type ReservationMailInput = {
  to: string
  clientName: string
  dateLabel: string
  timeLabel: string
  partySize: number
  tableLabel: string | null
  chatUrl: string
}

function subject(): string {
  return `${restaurant.name} — reserva confirmada`
}

function textBody(input: ReservationMailInput): string {
  const lines = [
    `Hola ${input.clientName},`,
    '',
    `Tu mesa en ${restaurant.name} está apuntada:`,
    `Fecha: ${input.dateLabel}`,
    `Hora: ${input.timeLabel}`,
    `Comensales: ${input.partySize}`,
  ]
  if (input.tableLabel) {
    lines.push(`Mesa: ${input.tableLabel}`)
  }
  lines.push(
    '',
    'Si necesitas hablar con el restaurante, abre este chat de WhatsApp:',
    input.chatUrl,
    '',
    'Hasta pronto,',
    restaurant.name,
  )
  return lines.join('\n')
}

function htmlBody(input: ReservationMailInput): string {
  const tableRow = input.tableLabel
    ? `<p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><strong>Mesa:</strong> ${escapeHtml(input.tableLabel)}</p>`
    : ''
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f4ef;color:#1f1a17;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="padding:32px;background:#ffffff;border:1px solid #e7dfd4;border-radius:12px;">
          <p style="margin:0 0 16px;font-size:18px;font-weight:700;">${escapeHtml(restaurant.name)}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hola ${escapeHtml(input.clientName)},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Tu mesa está apuntada:</p>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><strong>Fecha:</strong> ${escapeHtml(input.dateLabel)}</p>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><strong>Hora:</strong> ${escapeHtml(input.timeLabel)}</p>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><strong>Comensales:</strong> ${String(input.partySize)}</p>
          ${tableRow}
          <p style="margin:24px 0;">
            <a href="${escapeHtml(input.chatUrl)}" style="display:inline-block;padding:12px 20px;background:#25d366;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;">
              Abrir chat con el restaurante
            </a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a7069;word-break:break-all;">
            ${escapeHtml(input.chatUrl)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/** Best-effort confirmation email with WhatsApp chat link. Never throws. */
export async function sendReservationChatEmail(
  input: ReservationMailInput,
): Promise<boolean> {
  const resend = getResendClient()
  if (!resend || !input.to.trim()) {
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: resendFrom(),
      to: [input.to.trim()],
      subject: subject(),
      html: htmlBody(input),
      text: textBody(input),
    })
    return !error
  } catch {
    return false
  }
}
