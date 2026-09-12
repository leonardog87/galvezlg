import { useEffect, useState } from 'react'
import cubierta from '../../assets/cubierta.webp'
import { addToCart } from '../../cart'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import type { ProductCategory } from './productCategories'
import './ProductsPage.css'

type Product = { id: number; category: string; title: string; price: number; quantity: number; description: string; images: string[] }
const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products`

const formatPrice = (price: number) =>
  price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

type ProductsPageProps = {
  category?: ProductCategory
}

export function ProductsPage({ category }: ProductsPageProps) {
  const search = category ? '' : (new URLSearchParams(window.location.search).get('search') || '').trim()
  const [products, setProducts] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [addedProduct, setAddedProduct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = category
      ? `${apiUrl}?category=${encodeURIComponent(category.slug)}`
      : search ? `${apiUrl}?search=${encodeURIComponent(search)}` : apiUrl
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<Product[]>
      })
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos. Verificá que la API esté iniciada.'))
      .finally(() => setLoading(false))
  }, [category, search])

  const updateQuantity = (id: number, nextValue: number, stock: number) => {
    setQuantities((current) => ({ ...current, [id]: Math.min(stock, Math.max(1, nextValue)) }))
    setAddedProduct(null)
  }

  return (
    <div className="products-page">
      <Header />
      <main className="products-page__main">
        <header className="catalog-hero">
          <div>
            <span className="catalog-hero__eyebrow">{category ? `PRODUCTOS · ${category.name}` : search ? 'RESULTADOS DE BÚSQUEDA' : 'TODOS LOS PRODUCTOS'}</span>
            <h1>{category ? category.name : search ? <>Resultados para<br /><em>“{search}”.</em></> : <>Lo que necesitas<br /><em>para tu moto.</em></>}</h1>
          </div>
          <p>{category ? `Explorá los productos disponibles en ${category.name.toLocaleLowerCase('es-AR')}.` : 'Rendimiento, agarre y durabilidad para llevar tu moto al límite. Elegí el producto ideal y la cantidad que necesitás.'}</p>
        </header>

        <section className="product-catalog" aria-label={category ? `Catálogo de ${category.name}` : 'Catálogo de productos'}>
          <div className="product-catalog__meta"><span>{products.length} {products.length === 1 ? 'producto' : 'productos'}</span><span>Ordenar por: destacados</span></div>
          {loading && <p className="product-catalog__status">Cargando productos…</p>}
          {error && <p className="product-catalog__status product-catalog__status--error">{error}</p>}
          {!loading && !error && products.length === 0 && <p className="product-catalog__status">{search ? `No encontramos productos para “${search}”.` : 'Todavía no hay productos cargados.'}</p>}
          <div className="product-catalog__grid">
            {products.map((product, index) => {
              const quantity = quantities[product.id] ?? 1
              const productName = product.title || `Producto ${index + 1}`
              return (
                <article className="product-card" key={product.id}>
                  <a className="product-card__visual" href={`/productos/detalle/${product.id}`} aria-label={`Ver detalle de ${productName}`}>
                    <span className="product-card__number">0{index + 1}</span>
                    <span className="product-card__tag">NUEVO</span>
                    <img src={product.images[0] || cubierta} alt={productName} />
                  </a>
                  <div className="product-card__content">
                    <p className="product-card__brand">{category?.name || product.category}</p>
                    <h2><a href={`/productos/detalle/${product.id}`}>{productName}</a></h2>
                    <p className="product-card__description">{product.description}</p>
                    <div className="product-card__purchase">
                      <div className="product-card__price"><small>PRECIO</small><strong>{formatPrice(product.price)}</strong></div>
                      <div className="quantity-picker" aria-label={`Cantidad de ${productName}`}>
                        <button type="button" onClick={() => updateQuantity(product.id, quantity - 1, product.quantity)} aria-label="Restar una unidad">−</button>
                        <input aria-label="Cantidad" type="number" min="1" max={product.quantity} value={quantity} onChange={(event) => updateQuantity(product.id, Number(event.target.value), product.quantity)} />
                        <button type="button" onClick={() => updateQuantity(product.id, quantity + 1, product.quantity)} aria-label="Sumar una unidad">+</button>
                      </div>
                    </div>
                    <button className={`product-card__add${addedProduct === product.id ? ' product-card__add--done' : ''}`} type="button" onClick={() => {
                      addToCart({ id: product.id, description: product.description, price: product.price, quantity: product.quantity, image: product.images[0] || cubierta }, quantity)
                      setAddedProduct(product.id)
                    }}>
                      <span>{addedProduct === product.id ? 'AGREGADO AL CARRITO' : 'AGREGAR AL CARRITO'}</span><span aria-hidden="true">{addedProduct === product.id ? '✓' : '→'}</span>
                    </button>
                    <p className="product-card__stock"><span /> {product.quantity} unidades disponibles</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
