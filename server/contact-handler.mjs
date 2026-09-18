import { normalizeContact, sendContactEmail, validateContact } from './contact-email.mjs'

const maxContactBodySize = 16 * 1024

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(status === 204 ? undefined : JSON.stringify(body))
}

const readContactBody = (request) => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', (chunk) => {
    body += chunk
    if (Buffer.byteLength(body) > maxContactBodySize) {
      reject(new Error('La consulta supera el tamaño permitido'))
      request.destroy()
    }
  })
  request.on('end', () => {
    try {
      resolve(JSON.parse(body))
    } catch {
      reject(new Error('La consulta no tiene un formato válido'))
    }
  })
  request.on('error', reject)
})

export const handleContactRequest = async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Método no permitido.' })
    return
  }

  try {
    const contact = normalizeContact(await readContactBody(request))
    const validationError = validateContact(contact)
    if (validationError === 'spam') {
      sendJson(response, 200, { sent: true })
      return
    }
    if (validationError) {
      sendJson(response, 400, { error: validationError })
      return
    }
    await sendContactEmail(contact)
    sendJson(response, 201, { sent: true })
  } catch (error) {
    const notConfigured = error instanceof Error && error.message.includes('no está configurado')
    console.error('No se pudo enviar la consulta de contacto:', error)
    sendJson(response, notConfigured ? 503 : 502, {
      error: notConfigured
        ? 'El canal de contacto todavía no está configurado.'
        : 'No pudimos enviar tu consulta. Intentá nuevamente en unos minutos.',
    })
  }
}
