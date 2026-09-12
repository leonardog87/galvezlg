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
    </main>
  )
}
