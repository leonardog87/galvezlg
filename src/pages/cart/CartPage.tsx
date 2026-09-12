import { useState } from 'react'
import { readCart, removeFromCart, updateCartQuantity, type CartItem } from '../../cart'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import './CartPage.css'

const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>(readCart)
  const refresh = () => setItems(readCart())
  const total = items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0)
  const change = (id: number, quantity: number) => { updateCartQuantity(id, quantity); refresh() }

  return <div className="cart-page"><Header /><main className="cart-page__main">
    <header className="cart-page__header"><span>TU COMPRA</span><h1>Carrito<em>.</em></h1><p>{items.length} {items.length === 1 ? 'producto' : 'productos'}</p></header>
    {!items.length ? <section className="cart-empty"><h2>Tu carrito está vacío.</h2><a href="/productos">VER PRODUCTOS →</a></section> :
      <div className="cart-layout"><section className="cart-items">
        {items.map((item) => <article className="cart-item" key={item.id}>
          <a href={`/productos/detalle/${item.id}`}><img src={item.image} alt={`Producto ${item.id}`} /></a>
          <div className="cart-item__info"><span>PRODUCTO #{item.id}</span><p>{item.description}</p><strong>{money(item.price)}</strong></div>
          <div className="cart-item__controls"><div className="quantity-picker">
            <button type="button" onClick={() => change(item.id, item.cartQuantity - 1)}>−</button>
            <input aria-label={`Cantidad del producto ${item.id}`} type="number" min="1" max={item.quantity} value={item.cartQuantity} onChange={(event) => change(item.id, Number(event.target.value))} />
            <button type="button" onClick={() => change(item.id, item.cartQuantity + 1)}>+</button>
          </div><button className="cart-item__remove" type="button" onClick={() => { removeFromCart(item.id); refresh() }}>Quitar</button></div>
          <strong className="cart-item__subtotal">{money(item.price * item.cartQuantity)}</strong>
        </article>)}
      </section><aside className="cart-summary"><span>RESUMEN</span><div><p>Subtotal</p><strong>{money(total)}</strong></div><div><p>Envío</p><small>A coordinar</small></div><div className="cart-summary__total"><p>TOTAL</p><strong>{money(total)}</strong></div><a className="cart-summary__checkout" href="/checkout">CONTINUAR COMPRA →</a><a href="/productos">← Seguir comprando</a></aside></div>}
  </main><Footer /></div>
}
