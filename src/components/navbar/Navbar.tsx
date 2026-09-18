import { useEffect, useState } from 'react'
import galvezLogo from '../../assets/Galvez_logo.webp'
import { cartCount, cartEvent } from '../../cart'
import { productCategories } from '../../pages/products/productCategories'
import './Navbar.css'

const links = [
  { label: 'Inicio', href: '/' },
  { label: 'Contacto', href: '/contacto' },
]
const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')
type Suggestion = { label: string; kind: 'Producto' | 'Categoría' }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function Navbar() {
  const [itemsInCart, setItemsInCart] = useState(cartCount)
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  useEffect(() => {
    const refresh = () => setItemsInCart(cartCount())
    window.addEventListener(cartEvent, refresh); window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(cartEvent, refresh); window.removeEventListener('storage', refresh) }
  }, [])
  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const categorySuggestions: Suggestion[] = productCategories
        .filter((category) => normalize(category.name).includes(normalize(query)))
        .slice(0, 4)
        .map((category) => ({ label: category.name, kind: 'Categoría' }))
      try {
        const response = await fetch(`${apiBase}/api/products/suggestions?search=${encodeURIComponent(query)}`, { signal: controller.signal })
        const titles: string[] = response.ok ? await response.json() : []
        setSuggestions([...categorySuggestions, ...titles.map((title): Suggestion => ({ label: title, kind: 'Producto' }))].slice(0, 7))
        setShowSuggestions(true)
      } catch {
        if (!controller.signal.aborted) setSuggestions(categorySuggestions)
      }
    }, 220)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [search])

  const runSearch = (value = search) => {
    const query = value.trim()
    window.location.assign(query ? `/productos?search=${encodeURIComponent(query)}` : '/productos')
  }
  return (
    <nav className="navbar" aria-label="Navegación principal">
      <a className="navbar__brand" href="/" aria-label="Volver a la página principal">
        <img src={galvezLogo} alt="Gálvez" />
      </a>

      <div className="navbar__center">
        <ul className="navbar__links">
          <li>
            <a href={links[0].href}>{links[0].label}</a>
          </li>
          <li className="navbar__products">
            <a href="/productos" className="navbar__products-trigger">
              PRODUCTOS
            </a>
            <div className="navbar__mega-menu">
              <ul aria-label="Categorías de productos">
                <li className="navbar__manage-products">
                  <a href="/productos">VER PRODUCTOS</a>
                </li>
                {productCategories.map((category) => (
                  <li key={category.slug}>
                    <a href={`/productos/${category.slug}`}>{category.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
          <li>
            <a href={links[1].href}>{links[1].label}</a>
          </li>
        </ul>

        <form
          className="navbar__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            runSearch()
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
        >
          <label className="sr-only" htmlFor="product-search">
            Buscar productos
          </label>
          <input id="product-search" type="search" placeholder="Buscar por nombre o tipo" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" aria-label="Buscar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
          {showSuggestions && search.trim().length >= 2 && (
            <div className="navbar__suggestions" role="listbox" aria-label="Sugerencias de búsqueda">
              {suggestions.length ? suggestions.map((suggestion) => (
                <button key={`${suggestion.kind}-${suggestion.label}`} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => runSearch(suggestion.label)}>
                  <span>{suggestion.label}</span><small>{suggestion.kind}</small>
                </button>
              )) : <p>No hay sugerencias</p>}
            </div>
          )}
        </form>
      </div>

      <div className="navbar__actions">
        <a className="navbar__phone" href="https://wa.me/541124553688?text=Hola%2C%20quisiera%20hacer%20una%20consulta." target="_blank" rel="noopener noreferrer" aria-label="Enviar un mensaje por WhatsApp al 11 2455 3688">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.5 4.8 5.1c-.8.5-1.1 1.5-.7 2.4 2.5 6 7.2 10.7 13.2 13.2.9.4 1.9.1 2.4-.7l1.6-2.4-4.6-3-1.5 2.1a15.6 15.6 0 0 1-7.6-7.6l2.1-1.5-2.5-4.1Z" /></svg>
          <span><small>CONTACTO</small>11-2455-3688</span>
        </a>
        <a className="navbar__cart" href="/carrito" aria-label="Abrir carrito de compras">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3h2l2.2 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.3 7H6" />
            <circle cx="9.5" cy="19" r="1.25" />
            <circle cx="17.5" cy="19" r="1.25" />
          </svg>
          <span className="navbar__cart-count" aria-label={`${itemsInCart} productos`}>
            {itemsInCart}
          </span>
        </a>
      </div>
    </nav>
  )
}
