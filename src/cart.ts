export type CartItem = { id: number; description: string; price: number; quantity: number; image: string; cartQuantity: number }
const storageKey = 'galvezCart'
export const cartEvent = 'galvez-cart-change'
export const readCart = (): CartItem[] => {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
const save = (items: CartItem[]) => { localStorage.setItem(storageKey, JSON.stringify(items)); window.dispatchEvent(new Event(cartEvent)) }
export const addToCart = (product: Omit<CartItem, 'cartQuantity'>, amount = 1) => {
  const items = readCart(); const existing = items.find((item) => item.id === product.id)
  if (existing) existing.cartQuantity = Math.min(product.quantity, existing.cartQuantity + amount)
  else items.push({ ...product, cartQuantity: Math.min(product.quantity, Math.max(1, amount)) })
  save(items)
}
export const updateCartQuantity = (id: number, amount: number) => save(readCart().map((item) => item.id === id ? { ...item, cartQuantity: Math.min(item.quantity, Math.max(1, amount)) } : item))
export const removeFromCart = (id: number) => save(readCart().filter((item) => item.id !== id))
export const clearCart = () => save([])
export const cartCount = () => readCart().reduce((total, item) => total + item.cartQuantity, 0)
