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

function App() {
  const productId = window.location.pathname.match(/^\/productos\/detalle\/(\d+)\/?$/)?.[1]
  const category = findProductCategory(window.location.pathname)

  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/carrito') return <CartPage />
  if (window.location.pathname === '/checkout') return <CheckoutPage />
  if (window.location.pathname === '/pago/exitoso') return <PaymentResultPage status="success" />
  if (window.location.pathname === '/pago/pendiente') return <PaymentResultPage status="pending" />
  if (window.location.pathname === '/pago/error') return <PaymentResultPage status="failure" />
  if (window.location.pathname === '/administrar-productos') return <AdminProductsPage />
  if (productId) return <ProductDetailPage productId={Number(productId)} />
  if (category) return <ProductCategoryPage category={category} />
  if (window.location.pathname === '/productos') return <ProductsPage />
  if (window.location.pathname === '/contacto') return <ContactPage />
  return <HomePage />
}

export default App
