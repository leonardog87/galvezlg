import { useState, type FormEvent } from 'react'
import { readCart } from '../../cart'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import './CheckoutPage.css'

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function CheckoutPage() {
  const items = readCart()
  const total = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '', postalCode: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const update = (field: keyof typeof customer, value: string) => setCustomer((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!items.length) return setMessage('Tu carrito está vacío.')
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${apiBase}/api/checkout/preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: items.map((item) => ({ id: item.id, quantity: item.cartQuantity })) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar el pago.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar el pago.')
      setLoading(false)
    }
  }

  if (!items.length) return <div className="checkout-page"><Header /><main className="checkout-empty"><h1>Tu carrito está vacío.</h1><a href="/productos">VER PRODUCTOS →</a></main><Footer /></div>

  return <div className="checkout-page"><Header /><main className="checkout-main">
    <section className="checkout-intro"><span>FINALIZAR COMPRA</span><h1>Datos de<br /><em>entrega.</em></h1><p>Completá tus datos. En el siguiente paso vas a pagar de forma segura en Mercado Pago.</p></section>
    <form className="checkout-form" onSubmit={submit}>
      <div className="checkout-form__title"><span>01</span><h2>Contacto y envío</h2></div>
      <label><span>NOMBRE Y APELLIDO</span><input autoComplete="name" value={customer.name} onChange={(e) => update('name', e.target.value)} required /></label>
      <div className="checkout-form__row">
        <label><span>EMAIL</span><input type="email" autoComplete="email" value={customer.email} onChange={(e) => update('email', e.target.value)} required /></label>
        <label><span>TELÉFONO</span><input type="tel" autoComplete="tel" value={customer.phone} onChange={(e) => update('phone', e.target.value)} required /></label>
      </div>
      <label><span>DIRECCIÓN</span><input autoComplete="street-address" value={customer.address} onChange={(e) => update('address', e.target.value)} required /></label>
      <div className="checkout-form__row">
        <label><span>CIUDAD</span><input autoComplete="address-level2" value={customer.city} onChange={(e) => update('city', e.target.value)} required /></label>
        <label><span>CÓDIGO POSTAL</span><input autoComplete="postal-code" value={customer.postalCode} onChange={(e) => update('postalCode', e.target.value)} required /></label>
      </div>
      <div className="checkout-summary"><span>RESUMEN</span>{items.map((item) => <p key={item.id}><span>Producto #{item.id} × {item.cartQuantity}</span><strong>{money(item.price * item.cartQuantity)}</strong></p>)}<div><span>TOTAL</span><strong>{money(total)}</strong></div></div>
      {message && <p className="checkout-form__message" role="alert">{message}</p>}
      <button type="submit" disabled={loading}>{loading ? 'CONECTANDO…' : 'PAGAR CON MERCADO PAGO →'}</button>
      <small>El importe definitivo se verifica en el servidor antes de generar el pago.</small>
    </form>
  </main><Footer /></div>
}
