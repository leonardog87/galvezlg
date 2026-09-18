import { useState } from 'react'
import comprarImage from '../../assets/comprar.jpg'
import enviosImage from '../../assets/envios.jpg'
import repuestosImage from '../../assets/respuestos.jpg'

const informationCards = [
  {
    id: 'comprar',
    src: comprarImage,
    alt: 'Cómo comprar en Gálvez Moto Parts por la tienda web o WhatsApp',
  },
  {
    id: 'envios',
    src: enviosImage,
    alt: 'Opciones de envío y retiro de Gálvez Moto Parts',
  },
  {
    id: 'repuestos',
    src: repuestosImage,
    alt: 'Sistema de repuestos a pedido de Gálvez Moto Parts',
  },
]

const paymentMethods = [
  { title: 'Tarjetas de crédito', detail: 'Visa · Mastercard · American Express · Naranja X · Cabal · Diners · Cencosud · Argencard · Shopping · CMR', icon: 'card' },
  { title: 'Tarjetas de débito', detail: 'Visa Débito · Mastercard Débito · Maestro · Cabal', icon: 'card' },
  { title: 'Tarjetas prepagas', detail: 'Visa · Mastercard', icon: 'card' },
  { title: 'Dinero en Mercado Pago', detail: 'Pagá usando el saldo disponible en tu cuenta.', icon: 'wallet' },
  { title: 'Cuotas sin tarjeta', detail: 'Financiación disponible directamente desde Mercado Pago.', icon: 'installments' },
  { title: 'Efectivo', detail: 'Rapipago · Pago Fácil', icon: 'cash' },
] as const

function PaymentIcon({ type }: { type: typeof paymentMethods[number]['icon'] }) {
  if (type === 'wallet') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 9.5h20a2 2 0 0 1 2 2v13H7a3 3 0 0 1-3-3v-14a3 3 0 0 1 3-3h16"/><path d="M21 14h7v6h-7a3 3 0 0 1 0-6Z"/><circle cx="22" cy="17" r=".8"/></svg>
  if (type === 'installments') return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="3"/><path d="M4 13h24M9 19h5M20 18v4M18 20h4"/></svg>
  if (type === 'cash') return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="8" width="24" height="16" rx="2"/><circle cx="16" cy="16" r="4"/><path d="M8 12h1M23 20h1"/></svg>
  return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="20" rx="3"/><path d="M3 12h26M8 20h7"/></svg>
}

export function Main() {
  const [activeCard, setActiveCard] = useState(0)
  const currentCard = informationCards[activeCard]

  const showPrevious = () => {
    setActiveCard((current) =>
      current === 0 ? informationCards.length - 1 : current - 1,
    )
  }

  const showNext = () => {
    setActiveCard((current) => (current + 1) % informationCards.length)
  }

  return (
    <main className="home-page__main" id="informacion">
      <section className="home-page__hero" aria-label="Gálvez Moto Parts">
        <div
          className="info-carousel"
          aria-roledescription="carrusel"
          aria-label="Información de compra"
        >
          <div className="info-carousel__viewport" aria-live="polite">
            <img
              key={currentCard.id}
              src={currentCard.src}
              alt={currentCard.alt}
            />
          </div>

          <div className="info-carousel__controls">
            <button type="button" onClick={showPrevious} aria-label="Imagen anterior">
              <span aria-hidden="true">←</span>
            </button>
            <span aria-hidden="true">
              {activeCard + 1} / {informationCards.length}
            </span>
            <button type="button" onClick={showNext} aria-label="Imagen siguiente">
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="info-grid" aria-label="Información de compra">
        {informationCards.map((card) => (
          <article className="info-grid__card" key={card.id}>
            <img src={card.src} alt={card.alt} loading="lazy" />
          </article>
        ))}
      </section>

      <section className="payment-methods" aria-labelledby="payment-methods-title">
        <div className="payment-methods__heading">
          <div>
            <span>MEDIOS DE PAGO</span>
            <h2 id="payment-methods-title">Pagá como prefieras.</h2>
          </div>
          <p>Procesamos tu compra de forma segura a través de Mercado Pago.</p>
        </div>
        <div className="payment-methods__grid">
          {paymentMethods.map((method) => (
            <article className="payment-method" key={method.title}>
              <div className="payment-method__icon"><PaymentIcon type={method.icon} /></div>
              <div><h3>{method.title}</h3><p>{method.detail}</p></div>
            </article>
          ))}
        </div>
        <small>Las opciones disponibles pueden variar según tu cuenta y se confirman al ingresar al checkout de Mercado Pago.</small>
      </section>
    </main>
  )
}
