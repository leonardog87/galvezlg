import { useEffect, useState } from 'react'
import { clearCart } from '../../cart'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import './CheckoutPage.css'

const content = {
  success: { eyebrow: 'PAGO APROBADO', title: '¡Gracias por tu compra!', text: 'Recibimos tu pago correctamente. Nos comunicaremos con vos para coordinar la entrega.' },
  pending: { eyebrow: 'PAGO PENDIENTE', title: 'Estamos esperando el pago.', text: 'Tu operación está en proceso. Te avisaremos cuando Mercado Pago confirme la acreditación.' },
  failure: { eyebrow: 'PAGO NO COMPLETADO', title: 'No pudimos procesar el pago.', text: 'No se realizó ningún cobro. Podés volver al carrito e intentarlo nuevamente.' },
}

export function PaymentResultPage({ status: _returnStatus }: { status: keyof typeof content }) {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('order_id')
  const orderToken = params.get('order_token')
  const hasOrderCredentials = Boolean(orderId && orderToken)
  const [confirmedStatus, setConfirmedStatus] = useState<keyof typeof content | 'loading'>(hasOrderCredentials ? 'loading' : 'failure')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [error, setError] = useState(hasOrderCredentials ? '' : 'No pudimos identificar la orden de forma segura.')
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    if (!orderId || !orderToken) return
    fetch(`${apiBase}/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(orderToken)}`)
      .then(async (response) => {
        const order = await response.json()
        if (!response.ok) throw new Error(order.error || 'No pudimos consultar la orden.')
        const nextStatus = order.status === 'approved'
          ? 'success'
          : ['pending', 'in_process', 'in_mediation'].includes(order.status) ? 'pending' : 'failure'
        setConfirmedStatus(nextStatus)
        setPaymentId(order.paymentId || null)
        if (nextStatus === 'success') clearCart()
      })
      .catch((reason) => {
        setConfirmedStatus('failure')
        setError(reason instanceof Error ? reason.message : 'No pudimos consultar la orden.')
      })
  }, [apiBase, orderId, orderToken])

  if (confirmedStatus === 'loading') return <div className="checkout-page"><Header /><main className="payment-result payment-result--pending"><span>VERIFICANDO PAGO</span><h1>Estamos confirmando tu operación.</h1><p>Esperá unos segundos mientras consultamos el estado seguro de la orden.</p></main><Footer /></div>
  const result = content[confirmedStatus]
  return <div className="checkout-page"><Header /><main className={`payment-result payment-result--${confirmedStatus}`}>
    <span>{result.eyebrow}</span><h1>{result.title}</h1><p>{result.text}</p>
    {error && <p role="alert">{error}</p>}
    {paymentId && <small>Comprobante de pago: {paymentId}</small>}
    <div><a href={confirmedStatus === 'failure' ? '/carrito' : '/productos'}>{confirmedStatus === 'failure' ? 'VOLVER AL CARRITO' : 'SEGUIR COMPRANDO'} →</a><a href="/">Ir al inicio</a></div>
  </main><Footer /></div>
}
