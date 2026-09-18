const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = (value, maximumLength) => String(value || '').trim().slice(0, maximumLength)
const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

export const normalizeContact = (body = {}) => ({
  name: clean(body.name, 100),
  phone: clean(body.phone, 50),
  email: clean(body.email, 254).toLocaleLowerCase(),
  motorcycle: clean(body.motorcycle, 150),
  message: clean(body.message, 4000),
  website: clean(body.website, 200),
})

export const validateContact = (contact) => {
  if (contact.website) return 'spam'
  if (!contact.name || !contact.phone || !emailPattern.test(contact.email) || contact.message.length < 10) {
    return 'Completá correctamente tu nombre, teléfono, correo y consulta.'
  }
  return ''
}

export const sendContactEmail = async (contact, configuration = process.env) => {
  const apiKey = String(configuration.RESEND_API_KEY || '')
  const to = String(configuration.CONTACT_TO_EMAIL || 'mailTest@mail.com')
  const from = String(configuration.CONTACT_FROM_EMAIL || '')
  if (!apiKey || !from) throw new Error('El servicio de contacto no está configurado')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: contact.email,
      subject: `Nueva consulta web de ${contact.name}`,
      html: `<h1>Nueva consulta desde la web</h1>
        <p><strong>Nombre:</strong> ${escapeHtml(contact.name)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(contact.phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
        <p><strong>Moto / modelo:</strong> ${escapeHtml(contact.motorcycle || 'No especificado')}</p>
        <p><strong>Consulta:</strong></p>
        <p>${escapeHtml(contact.message).replaceAll('\n', '<br>')}</p>`,
      text: `Nueva consulta desde la web\n\nNombre: ${contact.name}\nTeléfono: ${contact.phone}\nEmail: ${contact.email}\nMoto / modelo: ${contact.motorcycle || 'No especificado'}\n\nConsulta:\n${contact.message}`,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('Resend rechazó el correo de contacto:', response.status, details)
    throw new Error('El proveedor de correo rechazó el envío')
  }
  return response.json()
}
