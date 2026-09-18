import { HomePage } from './pages/home/HomePage'
import { ContactPage } from './pages/contact/ContactPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { AdminProductsPage } from './pages/products/AdminProductsPage'
import { LoginPage } from './pages/login/LoginPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { CartPage } from './pages/cart/CartPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { PaymentResultPage } from './pages/checkout/PaymentResultPage'
import { ProductCategoryPage } from './pages/products/ProductCategoryPage'
import { findProductCategory } from './pages/products/productCategories'
import { Seo } from './components/seo/Seo'

const privateSeo = <Seo title="Gálvez Moto Parts" description="Gestión y proceso de compra de Gálvez Moto Parts." noindex />

function App() {
  const productId = window.location.pathname.match(/^\/productos\/detalle\/(\d+)\/?$/)?.[1]
  const category = findProductCategory(window.location.pathname)

  if (window.location.pathname === '/login') return <>{privateSeo}<LoginPage /></>
  if (window.location.pathname === '/carrito') return <>{privateSeo}<CartPage /></>
  if (window.location.pathname === '/checkout') return <>{privateSeo}<CheckoutPage /></>
  if (window.location.pathname === '/pago/exitoso') return <>{privateSeo}<PaymentResultPage status="success" /></>
  if (window.location.pathname === '/pago/pendiente') return <>{privateSeo}<PaymentResultPage status="pending" /></>
  if (window.location.pathname === '/pago/error') return <>{privateSeo}<PaymentResultPage status="failure" /></>
  if (window.location.pathname === '/administrar-productos') return <>{privateSeo}<AdminProductsPage /></>
  if (productId) return <ProductDetailPage productId={Number(productId)} />
  if (category) return <ProductCategoryPage category={category} />
  if (window.location.pathname === '/productos') return <ProductsPage />
  if (window.location.pathname === '/contacto') return <ContactPage />
  return <HomePage />
}

export default App
