import type Stripe from 'stripe'
import { isLocale, type Locale } from '../src/i18n/locales.ts'
import { displayMenuItem } from '../src/menu.ts'
import { pickupSlotsForDate } from '../src/openingHours.ts'
import { listPublishedMenu } from './publishedMenu.ts'
import { getStripeClient } from './stripeClient.ts'

const MAX_QTY = 20
const MAX_LINES = 40
const INTEGRATION_IDENTIFIER = 'yamachan_takeout_vq8nmk2r'

const CARD_ONLY_EXCLUDED: Stripe.Checkout.SessionCreateParams.ExcludedPaymentMethodType[] =
  [
    'acss_debit',
    'affirm',
    'afterpay_clearpay',
    'alipay',
    'alma',
    'amazon_pay',
    'au_becs_debit',
    'bacs_debit',
    'bancontact',
    'billie',
    'bizum',
    'blik',
    'boleto',
    'cashapp',
    'crypto',
    'customer_balance',
    'eps',
    'fpx',
    'giropay',
    'grabpay',
    'ideal',
    'kakao_pay',
    'klarna',
    'konbini',
    'kr_card',
    'mb_way',
    'mobilepay',
    'multibanco',
    'naver_pay',
    'nz_bank_account',
    'oxxo',
    'p24',
    'pay_by_bank',
    'payco',
    'paynow',
    'paypal',
    'payto',
    'pix',
    'promptpay',
    'revolut_pay',
    'samsung_pay',
    'satispay',
    'scalapay',
    'sepa_debit',
    'sofort',
    'sunbit',
    'swish',
    'twint',
    'upi',
    'us_bank_account',
    'wechat_pay',
    'zip',
  ]

export type TakeoutCartLine = {
  slug: string
  qty: number
}

export type TakeoutCheckoutInput = {
  items: TakeoutCartLine[]
  name: string
  phone: string
  pickupDate: string
  pickupSlot: string
  notes: string
  locale: Locale
  origin: string
}

export type PaidTakeoutSession = {
  paid: boolean
  name: string
  phone: string
  pickupDate: string
  pickupSlot: string
  notes: string
  amountTotal: number
  lines: { name: string; qty: number; amount: number }[]
}

export class TakeoutCheckoutError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TakeoutCheckoutError'
    this.status = status
  }
}

function stripeLocale(locale: Locale): Stripe.Checkout.SessionCreateParams.Locale {
  switch (locale) {
    case 'es':
      return 'es'
    case 'en':
      return 'en'
    case 'ja':
      return 'ja'
    case 'pt-BR':
      return 'pt-BR'
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}

function meta(value: string): string {
  return value.slice(0, 500)
}

export function publicOrigin(request: Request): string {
  const url = new URL(request.url)
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    url.protocol.replace(':', '')
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host') ||
    url.host
  return `${proto}://${host}`
}

export function parseCheckoutBody(value: unknown): TakeoutCheckoutInput | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.items) || row.items.length === 0) {
    return null
  }
  const items: TakeoutCartLine[] = []
  for (const entry of row.items) {
    if (!entry || typeof entry !== 'object') {
      return null
    }
    const line = entry as Record<string, unknown>
    const slug = typeof line.slug === 'string' ? line.slug.trim() : ''
    const qty = Number(line.qty)
    if (!slug || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return null
    }
    items.push({ slug, qty })
  }
  if (items.length > MAX_LINES) {
    return null
  }
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  const phone = typeof row.phone === 'string' ? row.phone.trim() : ''
  const pickupDate =
    typeof row.pickupDate === 'string' ? row.pickupDate.trim() : ''
  const pickupSlot =
    typeof row.pickupSlot === 'string' ? row.pickupSlot.trim() : ''
  const notes = typeof row.notes === 'string' ? row.notes.trim() : ''
  const locale = isLocale(row.locale) ? row.locale : 'es'
  if (!name || !phone || !pickupDate || !pickupSlot) {
    return null
  }
  return {
    items,
    name,
    phone,
    pickupDate,
    pickupSlot,
    notes,
    locale,
    origin: '',
  }
}

export async function createTakeoutCheckoutSession(
  input: TakeoutCheckoutInput,
): Promise<{ url: string }> {
  const stripe = getStripeClient()
  if (!stripe) {
    throw new TakeoutCheckoutError('missing-stripe', 503)
  }
  if (!pickupSlotsForDate(input.pickupDate).includes(input.pickupSlot)) {
    throw new TakeoutCheckoutError('invalid-slot', 400)
  }

  const menu = await listPublishedMenu()
  const bySlug = new Map(menu.map((item) => [item.slug, item]))
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  for (const line of input.items) {
    const item = bySlug.get(line.slug)
    if (!item || item.price_cents <= 0) {
      throw new TakeoutCheckoutError('invalid-item', 400)
    }
    const copy = displayMenuItem(item, input.locale)
    lineItems.push({
      quantity: line.qty,
      price_data: {
        currency: 'eur',
        unit_amount: item.price_cents,
        product_data: {
          name: copy.name.slice(0, 250),
          metadata: { slug: item.slug },
        },
      },
    })
  }

  const pickup = `${input.pickupDate} ${input.pickupSlot}`
  const configuration = process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION?.trim()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: stripeLocale(input.locale),
    submit_type: 'pay',
    integration_identifier: INTEGRATION_IDENTIFIER,
    excluded_payment_method_types: CARD_ONLY_EXCLUDED,
    ...(configuration ? { payment_method_configuration: configuration } : {}),
    line_items: lineItems,
    success_url: `${input.origin}/para-llevar?session_id={CHECKOUT_SESSION_ID}#pagado`,
    cancel_url: `${input.origin}/para-llevar?canceled=1#enviar`,
    metadata: {
      kind: 'takeout',
      name: meta(input.name),
      phone: meta(input.phone),
      pickup_date: meta(input.pickupDate),
      pickup_slot: meta(input.pickupSlot),
      notes: meta(input.notes),
      locale: input.locale,
    },
    payment_intent_data: {
      description: `Para llevar · ${input.name} · ${pickup}`,
      metadata: {
        kind: 'takeout',
        name: meta(input.name),
        phone: meta(input.phone),
        pickup: meta(pickup),
      },
    },
    custom_text: {
      submit: {
        message: `Recogida en Yama-Chan, C/ Pardo Gimeno, 10 · ${pickup}`,
      },
    },
  })

  if (!session.url) {
    throw new TakeoutCheckoutError('missing-checkout-url', 502)
  }
  return { url: session.url }
}

function sessionLines(
  session: Stripe.Checkout.Session,
): PaidTakeoutSession['lines'] {
  const data = session.line_items?.data ?? []
  return data.map((item) => ({
    name: item.description ?? '',
    qty: item.quantity ?? 0,
    amount: item.amount_total ?? 0,
  }))
}

export async function loadPaidTakeoutSession(
  sessionId: string,
): Promise<PaidTakeoutSession> {
  const stripe = getStripeClient()
  if (!stripe) {
    throw new TakeoutCheckoutError('missing-stripe', 503)
  }
  if (!sessionId.startsWith('cs_')) {
    throw new TakeoutCheckoutError('invalid-session', 400)
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  })
  const metadata = session.metadata ?? {}
  const paid =
    session.payment_status === 'paid' && session.status === 'complete'
  return {
    paid,
    name: metadata.name ?? '',
    phone: metadata.phone ?? '',
    pickupDate: metadata.pickup_date ?? '',
    pickupSlot: metadata.pickup_slot ?? '',
    notes: metadata.notes ?? '',
    amountTotal: session.amount_total ?? 0,
    lines: sessionLines(session),
  }
}

export function constructTakeoutWebhookEvent(
  payload: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripeClient()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) {
    throw new TakeoutCheckoutError('missing-stripe', 503)
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch {
    throw new TakeoutCheckoutError('invalid-signature', 400)
  }
}
