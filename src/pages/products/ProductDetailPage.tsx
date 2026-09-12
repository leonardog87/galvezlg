import { useEffect, useState } from 'react'
import cubierta from '../../assets/cubierta.webp'
import { addToCart } from '../../cart'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import { productCategories } from './productCategories'
import './ProductDetailPage.css'

type Product = {
  id: number
  category: string
  title: string
  description: string
  price: number
  quantity: number
  images: string[]
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const formatPrice = (price: number) =>
  price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function ProductDetailPage({ productId }: { productId: number }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    fetch(`${apiBase}/api/products/${productId}`)
      .then((response) => {
        if (!response.ok) throw new Error('El producto no existe o ya no está publicado.')
        return response.json() as Promise<Product>
      })
      .then(setProduct)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el producto.'))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) return <div className="product-detail-page"><Header /><main className="product-detail__status">Cargando producto…</main></div>
  if (!product || error) return <div className="product-detail-page"><Header /><main className="product-detail__status"><p>{error}</p><a href="/productos">← Volver al catálogo</a></main><Footer /></div>

  const images = product.images.length ? product.images : [cubierta]
  const category = productCategories.find((item) => item.slug === product.category)

  return (
    <div className="product-detail-page">
      <Header />
      <main className="product-detail">
        <nav className="product-detail__breadcrumb" aria-label="Migas de pan">
          <a href="/productos">Productos</a><span>/</span>
          <a href={`/productos/${product.category}`}>{category?.name || product.category}</a><span>/</span>
          <span>{product.title || `Producto #${product.id}`}</span>
        </nav>
        <section className="product-detail__layout">
          <div className="product-gallery">
            <div className="product-gallery__main"><img src={images[selectedImage]} alt={`Producto ${product.id}, imagen ${selectedImage + 1}`} /></div>
            {images.length > 1 && <div className="product-gallery__thumbs" aria-label="Imágenes del producto">
              {images.map((image, index) => (
                <button className={selectedImage === index ? 'is-active' : ''} type="button" key={`${image.slice(-20)}-${index}`} onClick={() => setSelectedImage(index)} aria-label={`Ver imagen ${index + 1}`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>}
          </div>
          <article className="product-detail__info">
            <span className="product-detail__category">{category?.name || product.category}</span>
            <h1>{product.title || 'Producto'} <em>#{product.id}.</em></h1>
            <strong className="product-detail__price">{formatPrice(product.price)}</strong>
            <div className="product-detail__description"><h2>Descripción</h2><p>{product.description}</p></div>
            <p className="product-detail__stock"><span /> {product.quantity} unidades disponibles</p>
            <div className="product-detail__actions">
              <div className="quantity-picker">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <input aria-label="Cantidad" type="number" min="1" max={product.quantity} value={quantity} onChange={(event) => setQuantity(Math.min(product.quantity, Math.max(1, Number(event.target.value))))} />
                <button type="button" onClick={() => setQuantity((value) => Math.min(product.quantity, value + 1))}>+</button>
              </div>
              <button className="product-detail__add" type="button" onClick={() => {
                addToCart({ id: product.id, description: product.description, price: product.price, quantity: product.quantity, image: images[0] }, quantity)
                setAdded(true)
              }}>{added ? 'AGREGADO ✓' : 'AGREGAR AL CARRITO →'}</button>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  )
}
