import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeContact, validateContact } from './contact-email.mjs'

test('normaliza y valida una consulta de contacto', () => {
  const contact = normalizeContact({
    name: '  Ana Pérez  ', phone: ' 11 5555-5555 ', email: ' ANA@MAIL.COM ', message: 'Necesito consultar por un repuesto.',
  })
  assert.equal(contact.name, 'Ana Pérez')
  assert.equal(contact.email, 'ana@mail.com')
  assert.equal(validateContact(contact), '')
})

test('rechaza datos inválidos y el campo trampa anti-spam', () => {
  assert.match(validateContact(normalizeContact({ name: 'Ana' })), /Completá/)
  assert.equal(validateContact(normalizeContact({ website: 'https://spam.example' })), 'spam')
})
