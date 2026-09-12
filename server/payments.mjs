import { createHmac, timingSafeEqual } from 'node:crypto'

const parseSignature = (header = '') => Object.fromEntries(
  String(header).split(',').map((part) => part.trim().split('=', 2)).filter(([key, value]) => key && value),
)

export const validateWebhookSignature = ({ signature, requestId, dataId, secret }) => {
  if (!signature || !requestId || !dataId || !secret) return false
  const { ts, v1 } = parseSignature(signature)
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const receivedBuffer = Buffer.from(v1, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export const validatePaymentForOrder = (payment, order) => {
  if (!payment || String(payment.id || '') === '') throw new Error('Mercado Pago devolvió un pago inválido')
  if (String(payment.external_reference) !== String(order.id)) throw new Error('El pago no corresponde a la orden')
  if (payment.metadata?.order_token !== order.publicToken) throw new Error('El pago no contiene el identificador seguro de la orden')
  if (payment.currency_id !== 'ARS') throw new Error('La moneda del pago no coincide con la orden')

  const paidCents = Math.round(Number(payment.transaction_amount) * 100)
  const orderCents = Math.round(Number(order.total) * 100)
  if (!Number.isFinite(paidCents) || paidCents !== orderCents) throw new Error('El importe del pago no coincide con la orden')
  if (order.mpCollectorId && String(payment.collector_id) !== String(order.mpCollectorId)) {
    throw new Error('El pago pertenece a otra cuenta de cobro')
  }
  return true
}

export const publicPaymentStatus = (status) => {
  if (status === 'approved') return 'approved'
  if (status === 'pending' || status === 'in_process' || status === 'in_mediation') return 'pending'
  return 'failure'
}
