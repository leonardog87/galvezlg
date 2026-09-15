import { createServer } from 'node:http'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { activateProduct, applyOrderPayment, createAdminUser, createOrder, createProduct, deactivateProduct, deleteAdminUser, deleteProduct, findAdminUser, getOrderForPayment, getProduct, getPublicOrder, listAdminProducts, listAdminUsers, listProducts, prepareOrderItems, searchProductSuggestions, searchProducts, setAdminUserActive, setOrderPreference } from './database.mjs'
import { validatePaymentForOrder, validateWebhookSignature } from './payments.mjs'

const port = Number(process.env.PORT || 3001)
const maxBodySize = 30 * 1024 * 1024
const adminUser = process.env.ADMIN_USERNAME || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'galvez2026'
const sessionDuration = 5 * 60 * 1000
const mercadoPagoAccessToken = process.env.MP_ACCESS_TOKEN || ''
const mercadoPagoWebhookSecret = process.env.MP_WEBHOOK_SECRET || ''
const publicSiteUrl = String(process.env.PUBLIC_SITE_URL || 'https://galvezlg.vercel.app').replace(/\/$/, '')
const publicApiUrl = String(process.env.PUBLIC_API_URL || publicSiteUrl).replace(/\/$/, '')
let mercadoPagoCollectorId = ''
const sessions = new Map()
const productCategories = new Set([
  'aceites-y-lubricantes',
  'bujias',
  'fluidos',
  'accesorios',
  'motocross',
  'transmisiones',
  'baterias',
  'camaras',
  'cubiertas',
  'filtros-de-aire',
  'pastillas-y-zapatas-de-freno',
  'filtros-de-aceite',
  'kit-service',
  'escapes',
  'cables-de-embrague',
])

const safeMatch = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received))
  const expectedBuffer = Buffer.from(String(expected))
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

const normalizeUsername = (value) => String(value || '').trim()
const isValidUsername = (value) => /^[a-zA-Z0-9._-]{3,32}$/.test(value)
const hashPassword = (password, salt) => scryptSync(password, salt, 64).toString('hex')

const matchesStoredPassword = (password, user) => {
  const receivedHash = Buffer.from(hashPassword(String(password || ''), user.passwordSalt), 'hex')
  const storedHash = Buffer.from(user.passwordHash, 'hex')
  return receivedHash.length === storedHash.length && timingSafeEqual(receivedHash, storedHash)
}

const getToken = (request) => {
  const authorization = request.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

const isAdmin = async (request) => {
  const token = getToken(request)
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token)
    return false
  }
  if (!session.isPrimary && !(await findAdminUser(session.username))?.isActive) {
    sessions.delete(token)
    return false
  }
  return true
}

const isPrimaryAdmin = (request) => {
  const session = sessions.get(getToken(request))
  return Boolean(session && session.expiresAt >= Date.now() && session.isPrimary)
}

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, GET, PATCH, POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(status === 204 ? undefined : JSON.stringify(body))
}

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (Buffer.byteLength(body) > maxBodySize) {
        reject(new Error('Las imágenes superan el límite de 30 MB'))
        request.destroy()
      }
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('El cuerpo de la solicitud no es válido'))
      }
    })
    request.on('error', reject)
  })

const mercadoPagoRequest = async (path, options = {}) => {
  if (!mercadoPagoAccessToken) throw new Error('Mercado Pago no está configurado. Definí MP_ACCESS_TOKEN en el servidor.')
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || 'Mercado Pago rechazó la operación')
  return result
}

const getMercadoPagoCollectorId = async () => {
  if (!mercadoPagoCollectorId) {
    const account = await mercadoPagoRequest('/users/me')
    if (!account?.id) throw new Error('No se pudo identificar la cuenta de Mercado Pago')
    mercadoPagoCollectorId = String(account.id)
  }
  return mercadoPagoCollectorId
}

const paymentReturnUrl = (pathname, order) => {
  const url = new URL(pathname, `${publicSiteUrl}/`)
  url.searchParams.set('order_id', String(order.id))
  url.searchParams.set('order_token', order.publicToken)
  return url.toString()
}

export const handleRequest = async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (requestUrl.pathname === '/api/products' && request.method === 'GET') {
    const category = requestUrl.searchParams.get('category') || ''
    const search = (requestUrl.searchParams.get('search') || '').trim().slice(0, 120)
    if (category && !productCategories.has(category)) {
      sendJson(response, 400, { error: 'Categoría inválida' })
      return
    }
    const categorySearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')
    sendJson(response, 200, search ? await searchProducts(search, categorySearch) : await listProducts(category))
    return
  }

  if (requestUrl.pathname === '/api/products/suggestions' && request.method === 'GET') {
    const search = (requestUrl.searchParams.get('search') || '').trim().slice(0, 120)
    sendJson(response, 200, search.length >= 2 ? await searchProductSuggestions(search) : [])
    return
  }

  const productDetailMatch = requestUrl.pathname.match(/^\/api\/products\/(\d+)$/)
  if (productDetailMatch && request.method === 'GET') {
    const product = await getProduct(Number(productDetailMatch[1]))
    sendJson(response, product ? 200 : 404, product || { error: 'Producto no encontrado' })
    return
  }

  if (request.url === '/api/admin/products' && request.method === 'GET') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    sendJson(response, 200, await listAdminProducts())
    return
  }

  if (productDetailMatch && request.method === 'DELETE') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    const deactivated = await deactivateProduct(Number(productDetailMatch[1]))
    sendJson(response, deactivated ? 200 : 404, deactivated
      ? { success: true }
      : { error: 'Producto no encontrado o dado de baja previamente' })
    return
  }

  if (productDetailMatch && request.method === 'PATCH') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    try {
      const body = await readJsonBody(request)
      const price = Number(body.price)
      const quantity = Number(body.quantity)
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
        sendJson(response, 400, { error: 'Ingresá un precio válido y una cantidad mayor que cero' })
        return
      }
      const product = await activateProduct(Number(productDetailMatch[1]), { price, quantity })
      sendJson(response, product ? 200 : 404, product || { error: 'Publicación no encontrada o ya se encuentra activa' })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'No se pudo dar de alta la publicación' })
    }
    return
  }

  const adminProductMatch = requestUrl.pathname.match(/^\/api\/admin\/products\/(\d+)$/)
  if (adminProductMatch && request.method === 'DELETE') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    const deleted = await deleteProduct(Number(adminProductMatch[1]))
    sendJson(response, deleted ? 200 : 404, deleted
      ? { success: true }
      : { error: 'Publicación no encontrada o borrada previamente' })
    return
  }

  if (request.url === '/api/auth/login' && request.method === 'POST') {
    try {
      const body = await readJsonBody(request)
      const username = normalizeUsername(body.username)
      const storedUser = await findAdminUser(username)
      const validEnvironmentAdmin = safeMatch(username, adminUser) && safeMatch(body.password, adminPassword)
      const validStoredAdmin = storedUser && storedUser.isActive && matchesStoredPassword(body.password, storedUser)
      if (!validEnvironmentAdmin && !validStoredAdmin) {
        sendJson(response, 401, { error: 'Usuario o contraseña incorrectos' })
        return
      }
      const token = randomBytes(32).toString('hex')
      const isPrimary = Boolean(validEnvironmentAdmin)
      sessions.set(token, { expiresAt: Date.now() + sessionDuration, isPrimary, username })
      sendJson(response, 200, { token, isPrimary })
    } catch {
      sendJson(response, 400, { error: 'No se pudo iniciar sesión' })
    }
    return
  }

  if (request.url === '/api/admin/users' && request.method === 'POST') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    try {
      const body = await readJsonBody(request)
      const username = normalizeUsername(body.username)
      const password = String(body.password || '')
      const passwordConfirmation = String(body.passwordConfirmation || '')

      if (!isValidUsername(username)) {
        sendJson(response, 400, { error: 'El usuario debe tener entre 3 y 32 caracteres y usar solo letras, números, punto, guion o guion bajo' })
        return
      }
      if (password.length < 8 || password.length > 128) {
        sendJson(response, 400, { error: 'La contraseña debe tener entre 8 y 128 caracteres' })
        return
      }
      if (password !== passwordConfirmation) {
        sendJson(response, 400, { error: 'Las contraseñas no coinciden' })
        return
      }
      if (safeMatch(username.toLocaleLowerCase(), adminUser.toLocaleLowerCase()) || await findAdminUser(username)) {
        sendJson(response, 409, { error: 'Ese nombre de usuario ya existe' })
        return
      }

      const passwordSalt = randomBytes(16).toString('hex')
      const user = await createAdminUser({ username, passwordHash: hashPassword(password, passwordSalt), passwordSalt })
      sendJson(response, 201, { id: user.id, username: user.username })
    } catch (error) {
      const duplicate = error instanceof Error && error.message.includes('UNIQUE constraint failed')
      sendJson(response, duplicate ? 409 : 400, { error: duplicate ? 'Ese nombre de usuario ya existe' : 'No se pudo crear el administrador' })
    }
    return
  }

  if (request.url === '/api/admin/users' && request.method === 'GET') {
    if (!isPrimaryAdmin(request)) {
      sendJson(response, 403, { error: 'Solo el administrador principal puede gestionar usuarios' })
      return
    }
    sendJson(response, 200, await listAdminUsers())
    return
  }

  const adminUserMatch = requestUrl.pathname.match(/^\/api\/admin\/users\/(\d+)$/)
  if (adminUserMatch && request.method === 'PATCH') {
    if (!isPrimaryAdmin(request)) {
      sendJson(response, 403, { error: 'Solo el administrador principal puede gestionar usuarios' })
      return
    }
    try {
      const body = await readJsonBody(request)
      if (typeof body.isActive !== 'boolean') throw new Error()
      const updated = await setAdminUserActive(Number(adminUserMatch[1]), body.isActive)
      sendJson(response, updated ? 200 : 404, updated ? { success: true } : { error: 'Usuario no encontrado' })
    } catch {
      sendJson(response, 400, { error: 'Estado de usuario inválido' })
    }
    return
  }

  if (adminUserMatch && request.method === 'DELETE') {
    if (!isPrimaryAdmin(request)) {
      sendJson(response, 403, { error: 'Solo el administrador principal puede gestionar usuarios' })
      return
    }
    const deleted = await deleteAdminUser(Number(adminUserMatch[1]))
    sendJson(response, deleted ? 200 : 404, deleted ? { success: true } : { error: 'Usuario no encontrado' })
    return
  }

  if (request.url === '/api/auth/session' && request.method === 'GET') {
    const authenticated = await isAdmin(request)
    const session = sessions.get(getToken(request))
    sendJson(response, authenticated ? 200 : 401, authenticated
      ? { authenticated: true, isPrimary: Boolean(session?.isPrimary), username: session?.username }
      : { error: 'No autorizado' })
    return
  }

  if (request.url === '/api/auth/logout' && request.method === 'POST') {
    sessions.delete(getToken(request))
    sendJson(response, 200, { success: true })
    return
  }

  if (request.url === '/api/products' && request.method === 'POST') {
    if (!(await isAdmin(request))) {
      sendJson(response, 401, { error: 'Se requiere una sesión de administrador' })
      return
    }
    try {
      const body = await readJsonBody(request)
      const price = Number(body.price)
      const quantity = Number(body.quantity)
      const title = String(body.title || '').trim()
      const description = String(body.description || '').trim()
      const category = String(body.category || '').trim()
      const images = Array.isArray(body.images) ? body.images : []

      if (!productCategories.has(category) || !title || title.length > 120 || !description || !Number.isFinite(price) || price < 0 ||
          !Number.isInteger(quantity) || quantity < 0 || images.length === 0) {
        sendJson(response, 400, { error: 'Datos de producto inválidos' })
        return
      }

      sendJson(response, 201, await createProduct({ category, title, description, price, quantity, images }))
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'No se pudo guardar el producto',
      })
    }
    return
  }

  if (request.url === '/api/checkout/preference' && request.method === 'POST') {
    try {
      if (!mercadoPagoAccessToken) {
        sendJson(response, 503, { error: 'Mercado Pago no está configurado. Definí MP_ACCESS_TOKEN en el servidor.' })
        return
      }
      if (!/^https:\/\//i.test(publicSiteUrl) || !/^https:\/\//i.test(publicApiUrl)) {
        sendJson(response, 503, { error: 'Configurá PUBLIC_SITE_URL y PUBLIC_API_URL con direcciones HTTPS públicas' })
        return
      }
      const body = await readJsonBody(request)
      const requestedItems = Array.isArray(body.items) ? body.items.map((item) => ({
        id: Number(item.id), quantity: Number(item.quantity),
      })) : []
      const customer = {
        name: String(body.customer?.name || '').trim(),
        email: String(body.customer?.email || '').trim(),
        phone: String(body.customer?.phone || '').trim(),
        address: String(body.customer?.address || '').trim(),
        city: String(body.customer?.city || '').trim(),
        postalCode: String(body.customer?.postalCode || '').trim(),
      }
      if (!requestedItems.length || Object.values(customer).some((value) => !value) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        sendJson(response, 400, { error: 'Completá correctamente los datos de contacto, entrega y productos' })
        return
      }

      const items = await prepareOrderItems(requestedItems)
      const collectorId = await getMercadoPagoCollectorId()
      const order = await createOrder({ customer, items, publicToken: randomBytes(24).toString('hex') })
      const preference = await mercadoPagoRequest('/checkout/preferences', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': randomBytes(16).toString('hex') },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: String(item.id),
            title: item.title || `Producto #${item.id}`,
            description: item.description,
            quantity: item.orderQuantity,
            unit_price: item.price,
            currency_id: 'ARS',
          })),
          payer: { name: customer.name, email: customer.email, phone: { number: customer.phone } },
          external_reference: String(order.id),
          metadata: { order_id: order.id, order_token: order.publicToken },
          back_urls: {
            success: paymentReturnUrl('/pago/exitoso', order),
            pending: paymentReturnUrl('/pago/pendiente', order),
            failure: paymentReturnUrl('/pago/error', order),
          },
          auto_return: 'approved',
          notification_url: `${publicApiUrl}/api/mercadopago/webhook`,
        }),
      })
      await setOrderPreference(order.id, preference.id, collectorId)
      sendJson(response, 201, { checkoutUrl: preference.init_point, orderId: order.id, orderToken: order.publicToken })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'No se pudo iniciar el pago' })
    }
    return
  }

  const publicOrderMatch = requestUrl.pathname.match(/^\/api\/orders\/(\d+)$/)
  if (publicOrderMatch && request.method === 'GET') {
    const token = requestUrl.searchParams.get('token') || ''
    const order = token && await getPublicOrder(Number(publicOrderMatch[1]), token)
    sendJson(response, order ? 200 : 404, order || { error: 'Orden no encontrada' })
    return
  }

  if (requestUrl.pathname === '/api/mercadopago/webhook' && request.method === 'POST') {
    try {
      if (!mercadoPagoWebhookSecret) {
        sendJson(response, 503, { error: 'La firma de webhooks de Mercado Pago no está configurada' })
        return
      }
      const body = await readJsonBody(request)
      const paymentId = requestUrl.searchParams.get('data.id')
      if (!paymentId || (body?.type && body.type !== 'payment')) {
        sendJson(response, 400, { error: 'Notificación de pago inválida' })
        return
      }
      const signatureIsValid = validateWebhookSignature({
        signature: request.headers['x-signature'],
        requestId: request.headers['x-request-id'],
        dataId: paymentId,
        secret: mercadoPagoWebhookSecret,
      })
      if (!signatureIsValid) {
        sendJson(response, 401, { error: 'Firma de webhook inválida' })
        return
      }

      const payment = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`)
      const orderId = Number(payment.external_reference)
      const order = Number.isInteger(orderId) && orderId > 0 ? await getOrderForPayment(orderId) : null
      if (!order) throw new Error('El pago refiere a una orden inexistente')
      validatePaymentForOrder(payment, order)
      await applyOrderPayment(order.id, String(payment.status), String(payment.id))
      sendJson(response, 200, { received: true })
    } catch (error) {
      console.error('No se pudo procesar el webhook de Mercado Pago:', error)
      sendJson(response, 500, { error: 'No se pudo procesar la notificación' })
    }
    return
  }

  sendJson(response, 404, { error: 'Ruta no encontrada' })
}

if (!process.env.VERCEL) {
  const server = createServer(handleRequest)
  server.listen(port, () => {
    console.log(`API disponible en http://localhost:${port}`)
  })
}
