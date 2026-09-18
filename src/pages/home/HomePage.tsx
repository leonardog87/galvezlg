import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import { Main } from '../../components/main/Main'
import { Seo } from '../../components/seo/Seo'
import './HomePage.css'

export function HomePage() {
  return (
    <div className="home-page">
      <Seo
        title="Gálvez Moto Parts Argentina | Repuestos para motos"
        description="Comprá online en Argentina repuestos e insumos para motos: cubiertas, aceites, filtros, baterías, frenos, transmisiones, bujías y accesorios."
        canonicalPath="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: 'Gálvez Moto Parts',
          url: window.location.origin,
          description: 'Venta de repuestos, insumos y accesorios para motos.',
          inLanguage: 'es-AR',
          areaServed: { '@type': 'Country', name: 'Argentina' },
          currenciesAccepted: 'ARS',
          paymentAccepted: 'Mercado Pago, tarjetas de crédito, tarjetas de débito y efectivo',
        }}
      />
      <Header />
      <Main />
      <Footer />
    </div>
  )
}
