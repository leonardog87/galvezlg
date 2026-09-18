import { useState, type FormEvent } from 'react'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import { Seo } from '../../components/seo/Seo'
import './ContactPage.css'

export function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setStatus('sending')
    setMessage('')
    try {
      const fields = Object.fromEntries(new FormData(form).entries())
      const response = await fetch(`${apiBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const responseText = await response.text()
      const result = responseText ? JSON.parse(responseText) : {}
      if (!response.ok) throw new Error(result.error || 'No pudimos enviar tu consulta.')
      setStatus('sent')
      setMessage('¡Consulta enviada! Te responderemos a la brevedad.')
      form.reset()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'No pudimos enviar tu consulta.')
    }
  }

  return (
    <div className="contact-page">
      <Seo title="Contacto en Argentina | Gálvez Moto Parts" description="Contactanos desde Argentina para consultar por repuestos, cubiertas, aceites, filtros y accesorios para tu moto." canonicalPath="/contacto" />
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

            <label className="contact-form__website" aria-hidden="true">
              <span>SITIO WEB</span>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>

            {message && (
              <p className={`contact-form__message contact-form__message--${status}`} role={status === 'error' ? 'alert' : 'status'}>
                {message}
              </p>
            )}

            <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'ENVIANDO…' : 'ENVIAR CONSULTA'}</button>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  )
}
