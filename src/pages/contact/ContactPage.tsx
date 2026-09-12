import { useState, type FormEvent } from 'react'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import './ContactPage.css'

export function ContactPage() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSent(true)
    event.currentTarget.reset()
  }

  return (
    <div className="contact-page">
      <Header />

      <main className="contact-page__main">
        <section className="contact-intro" aria-labelledby="contact-title">
          <span className="contact-intro__eyebrow">CONTACTO</span>
          <h1 id="contact-title">Hablemos de tu moto</h1>
          <p>
            Contanos qué repuesto o accesorio necesitás. Cuantos más datos nos
            compartas, mejor podremos asesorarte.
          </p>

          <div className="contact-intro__tips">
            <h2>Para una respuesta más rápida</h2>
            <ul>
              <li>Indicá marca, modelo y año de la moto.</li>
              <li>Agregá el nombre o número de pieza.</li>
              <li>Describí cualquier detalle importante.</li>
            </ul>
          </div>
        </section>

        <section className="contact-panel" aria-label="Formulario de contacto">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form__row">
              <label>
                <span>NOMBRE</span>
                <input type="text" name="name" autoComplete="name" placeholder="Tu nombre" required />
              </label>
              <label>
                <span>TELÉFONO</span>
                <input type="tel" name="phone" autoComplete="tel" placeholder="Tu teléfono" required />
              </label>
            </div>

            <label>
              <span>CORREO ELECTRÓNICO</span>
              <input type="email" name="email" autoComplete="email" placeholder="nombre@correo.com" required />
            </label>

            <label>
              <span>MOTO / MODELO</span>
              <input type="text" name="motorcycle" placeholder="Ej.: Honda Tornado XR 250" />
            </label>

            <label>
              <span>CONSULTA</span>
              <textarea name="message" rows={6} placeholder="¿En qué podemos ayudarte?" required />
            </label>

            {sent && (
              <p className="contact-form__success" role="status">
                Formulario completado. La integración del canal de envío está pendiente.
              </p>
            )}

            <button type="submit">ENVIAR CONSULTA</button>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  )
}
