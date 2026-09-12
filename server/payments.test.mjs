import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { after, before, test } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validatePaymentForOrder, validateWebhookSignature } from './payments.mjs'

const tempDirectory = mkdtempSync(join(tmpdir(), 'galvez-payment-test-'))
process.env.GALVEZ_DATABASE_PATH = join(tempDirectory, 'test.sqlite3')
let store

before(async () => { store = await import('./database.mjs') })
after(() => {
  store.database.close()
  rmSync(tempDirectory, { recursive: true, force: true })
})

const customer = { name: 'Comprador', email: 'test@example.com', phone: '123', address: 'Calle 1', city: 'Gálvez', postalCode: '2252' }
const image = 'data:image/png;base64,iVBORw0KGgo='

const newOrder = (stock = 2, requested = 1, token = `token-${Date.now()}-${Math.random()}`) => {
  const product = store.createProduct({ category: 'cubiertas', title: 'Producto de prueba', description: 'Test', price: 1500.25, quantity: stock, images: [image] })
  const items = store.prepareOrderItems([{ id: product.id, quantity: requested }])
  return { order: store.createOrder({ customer, items, publicToken: token }), product }
}

test('valida la firma HMAC oficial y rechaza firmas alteradas', () => {
  const dataId = '123456'
  const requestId = 'request-abc'
  const ts = '1742505638683'
  const secret = 'webhook-secret'
  const v1 = createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex')
  assert.equal(validateWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId, dataId, secret }), true)
  assert.equal(validateWebhookSignature({ signature: `ts=${ts},v1=${'0'.repeat(64)}`, requestId, dataId, secret }), false)
})

test('valida orden, token, importe, moneda y cobrador del pago', () => {
  const order = { id: 8, total: 1500.25, publicToken: 'safe-token', mpCollectorId: '99' }
  const payment = { id: 55, external_reference: '8', transaction_amount: 1500.25, currency_id: 'ARS', collector_id: 99, metadata: { order_token: 'safe-token' } }
  assert.equal(validatePaymentForOrder(payment, order), true)
  assert.throws(() => validatePaymentForOrder({ ...payment, transaction_amount: 1 }, order), /importe/)
  assert.throws(() => validatePaymentForOrder({ ...payment, currency_id: 'USD' }, order), /moneda/)
  assert.throws(() => validatePaymentForOrder({ ...payment, collector_id: 100 }, order), /cuenta/)
  assert.throws(() => validatePaymentForOrder({ ...payment, metadata: { order_token: 'otro' } }, order), /identificador/)
})

test('descuenta stock una sola vez ante webhooks duplicados', () => {
  const { order, product } = newOrder(2, 1)
  store.applyOrderPayment(order.id, 'approved', 'payment-1')
  store.applyOrderPayment(order.id, 'approved', 'payment-1')
  assert.equal(store.getProduct(product.id).quantity, 1)
  assert.equal(store.getPublicOrder(order.id, order.publicToken).status, 'approved')
  assert.throws(() => store.applyOrderPayment(order.id, 'approved', 'payment-distinto'), /otro pago/)
})

test('revierte toda la confirmación cuando ya no queda stock', () => {
  const first = newOrder(1, 1)
  const items = store.prepareOrderItems([{ id: first.product.id, quantity: 1 }])
  const secondOrder = store.createOrder({ customer, items, publicToken: 'second-order-token' })
  store.applyOrderPayment(first.order.id, 'approved', 'payment-first')
  assert.throws(() => store.applyOrderPayment(secondOrder.id, 'approved', 'payment-second'), /Stock insuficiente/)
  assert.equal(store.getOrderForPayment(secondOrder.id).status, 'pending')
})

test('un evento pendiente tardío no degrada una orden aprobada', () => {
  const { order } = newOrder()
  store.applyOrderPayment(order.id, 'approved', 'payment-state')
  store.applyOrderPayment(order.id, 'pending', 'payment-state')
  assert.equal(store.getOrderForPayment(order.id).status, 'approved')
})
