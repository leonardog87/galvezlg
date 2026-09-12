import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import { Main } from '../../components/main/Main'
import './HomePage.css'

export function HomePage() {
  return (
    <div className="home-page">
      <Header />
      <Main />
      <Footer />
    </div>
  )
}
