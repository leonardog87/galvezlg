import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Footer } from '../../components/footer/Footer'
import { Header } from '../../components/header/Header'
import { productCategories } from './productCategories'
import './AdminProductsPage.css'

const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products`
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'

type AdminProduct = {
  id: number
  category: string
  title: string
  description: string
  price: number
  quantity: number
  isActive: number
  images: string[]
}

type AdminUser = {
  id: number
  username: string
  isActive: number
  createdAt: string
}

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-AR')

export function AdminProductsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [managingProductId, setManagingProductId] = useState<number | null>(null)
  const [activatingProductId, setActivatingProductId] = useState<number | null>(null)
  const [activationPrice, setActivationPrice] = useState('')
  const [activationQuantity, setActivationQuantity] = useState('')
  const [titleSearch, setTitleSearch] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirmation, setAdminPasswordConfirmation] = useState('')
  const [userMessage, setUserMessage] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [managingUserId, setManagingUserId] = useState<number | null>(null)

  const loadAdminUsers = async (token: string) => {
    const response = await fetch(`${apiBase}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('No se pudo cargar la lista de administradores')
    setAdminUsers(await response.json())
  }

  const loadAdminProducts = async (token: string) => {
    const response = await fetch(`${apiBase}/api/admin/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('No se pudo cargar la lista de productos')
    setProducts(await response.json())
  }

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (!token) {
      window.location.replace('/login')
      return
    }

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) throw new Error('Sesión inválida')
      const session = await response.json()
      setIsPrimary(Boolean(session.isPrimary))
      setAuthorized(true)
      void loadAdminProducts(token).catch((error) => {
        setMessage(error instanceof Error ? error.message : 'No se pudo cargar la lista de productos')
      })
      if (session.isPrimary) void loadAdminUsers(token).catch((error) => {
        setUserMessage(error instanceof Error ? error.message : 'No se pudo cargar la lista de administradores')
      })
    }).catch(() => {
      sessionStorage.removeItem('adminToken')
      window.location.replace('/login')
    })
  }, [])

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) {
      setMessage('Seleccioná archivos de imagen válidos.')
      return
    }

    try {
      const newImages = await Promise.all(imageFiles.map(readFile))
      setImages((current) => [...current, ...newImages])
      setMessage('')
    } catch {
      setMessage('No se pudieron procesar las imágenes seleccionadas.')
    }
  }

  const handleImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    await addImages(files)
    event.target.value = ''
  }

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    await addImages(Array.from(event.dataTransfer.files))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!images.length) return setMessage('Agregá al menos una imagen del producto.')
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          category,
          title,
          price: Number(price),
          quantity: Number(quantity),
          description,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el producto.')
      setImages([])
      setPrice('')
      setQuantity('')
      setCategory('')
      setTitle('')
      setDescription('')
      setMessage('Producto guardado correctamente.')
      await loadAdminProducts(sessionStorage.getItem('adminToken') || '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (product: AdminProduct) => {
    if (!window.confirm(`¿Dar de baja el producto #${product.id}? Dejará de mostrarse en el catálogo.`)) return
    setManagingProductId(product.id)
    setMessage('')
    try {
      const response = await fetch(`${apiUrl}/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo dar de baja el producto.')
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, isActive: 0 } : item))
      setMessage(`Producto #${product.id} dado de baja correctamente.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo dar de baja el producto.')
    } finally {
      setManagingProductId(null)
    }
  }

  const openActivation = (product: AdminProduct) => {
    setActivatingProductId(product.id)
    setActivationPrice(String(product.price))
    setActivationQuantity('')
    setMessage('')
  }

  const activate = async (event: FormEvent<HTMLFormElement>, product: AdminProduct) => {
    event.preventDefault()
    setManagingProductId(product.id)
    setMessage('')
    try {
      const response = await fetch(`${apiUrl}/${product.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price: Number(activationPrice), quantity: Number(activationQuantity) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo dar de alta la publicación.')
      setProducts((current) => current.map((item) => item.id === product.id ? result : item))
      setActivatingProductId(null)
      setActivationPrice('')
      setActivationQuantity('')
      setMessage(`Publicación #${product.id} dada de alta correctamente.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo dar de alta la publicación.')
    } finally {
      setManagingProductId(null)
    }
  }

  const removeProduct = async (product: AdminProduct) => {
    if (!window.confirm(`¿Borrar la publicación “${product.title}”? Dejará de mostrarse, pero permanecerá en el historial de la base de datos.`)) return
    setManagingProductId(product.id)
    setMessage('')
    try {
      const response = await fetch(`${apiBase}/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo borrar la publicación.')
      setProducts((current) => current.filter((item) => item.id !== product.id))
      if (activatingProductId === product.id) setActivatingProductId(null)
      setMessage(`Publicación #${product.id} borrada del sitio. Su registro continúa en el historial.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo borrar la publicación.')
    } finally {
      setManagingProductId(null)
    }
  }

  const normalizedSearch = normalizeSearch(titleSearch.trim())
  const filteredProducts = products.filter((product) => normalizeSearch(product.title).includes(normalizedSearch))

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUserMessage('')
    const username = adminUsername.trim()
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      setUserMessage('El usuario debe tener entre 3 y 32 caracteres y usar solo letras, números, punto, guion o guion bajo.')
      return
    }
    if (adminPassword.length < 8) {
      setUserMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (adminPassword !== adminPasswordConfirmation) {
      setUserMessage('Las contraseñas no coinciden.')
      return
    }

    setCreatingUser(true)
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: adminPassword, passwordConfirmation: adminPasswordConfirmation }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo crear el administrador.')
      setAdminUsername('')
      setAdminPassword('')
      setAdminPasswordConfirmation('')
      setUserMessage(`Administrador “${result.username}” creado correctamente.`)
      if (isPrimary) await loadAdminUsers(sessionStorage.getItem('adminToken') || '')
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'No se pudo crear el administrador.')
    } finally {
      setCreatingUser(false)
    }
  }

  const updateUserStatus = async (user: AdminUser) => {
    const nextActive = !user.isActive
    setManagingUserId(user.id)
    setUserMessage('')
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: nextActive }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el usuario.')
      setAdminUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: nextActive ? 1 : 0 } : item))
      setUserMessage(`Usuario “${user.username}” ${nextActive ? 'reactivado' : 'bloqueado'} correctamente.`)
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'No se pudo actualizar el usuario.')
    } finally {
      setManagingUserId(null)
    }
  }

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`¿Eliminar definitivamente al administrador “${user.username}”?`)) return
    setManagingUserId(user.id)
    setUserMessage('')
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar el usuario.')
      setAdminUsers((current) => current.filter((item) => item.id !== user.id))
      setUserMessage(`Usuario “${user.username}” eliminado correctamente.`)
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'No se pudo eliminar el usuario.')
    } finally {
      setManagingUserId(null)
    }
  }

  if (!authorized) return <div className="admin-products" aria-busy="true" />

  return (
    <div className="admin-products">
      <Header />
      <main className="admin-products__main">
        <aside className="admin-products__intro">
          <span>ADMINISTRACIÓN</span>
          <h1>Cargar<br /><em>producto.</em></h1>
          <p>Agregá las imágenes, el precio, el stock disponible y toda la información del producto.</p>
          <a href="/productos">← Volver al catálogo</a>
          <button className="admin-products__logout" type="button" onClick={async () => {
            const token = sessionStorage.getItem('adminToken')
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token || ''}` },
            }).catch(() => undefined)
            sessionStorage.removeItem('adminToken')
            window.location.replace('/login')
          }}>Cerrar sesión</button>
        </aside>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__title"><span>01</span><h2>Información del producto</h2></div>
          <label
            className={`admin-form__dropzone${dragging ? ' admin-form__dropzone--dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
            onDragLeave={(event) => {
              event.preventDefault()
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
            }}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" multiple onChange={handleImages} />
            {images.length ? (
              <div className="admin-form__previews">
                {images.map((image, index) => (
                  <div className="admin-form__preview" key={`${image.slice(-24)}-${index}`}>
                    <img src={image} alt={`Vista previa ${index + 1}`} />
                    <button type="button" aria-label={`Quitar imagen ${index + 1}`} onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))
                    }}>×</button>
                  </div>
                ))}
              </div>
            ) : <><b>+</b><strong>Seleccionar imágenes</strong><small>PNG, JPG o WEBP</small></>}
          </label>
          {images.length > 0 && <button className="admin-form__clear" type="button" onClick={() => setImages([])}>Quitar imágenes</button>}
          <label>
            <span>CATEGORÍA</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} required>
              <option value="" disabled>Seleccionar una categoría</option>
              {productCategories.map((option) => (
                <option key={option.slug} value={option.slug}>{option.name}</option>
              ))}
            </select>
          </label>
          <div className="admin-form__row">
            <label><span>PRECIO</span><div className="admin-form__price"><b>$</b><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></div></label>
            <label><span>STOCK DISPONIBLE</span><input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
          </div>
          <label><span>TÍTULO</span><input type="text" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label><span>DESCRIPCIÓN</span><textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
          {message && <p className="admin-form__message" role="status">{message}</p>}
          <button className="admin-form__submit" type="submit" disabled={saving}>{saving ? 'GUARDANDO…' : 'GUARDAR PRODUCTO'} <span>→</span></button>
        </form>

        <section className="admin-list" aria-labelledby="admin-list-title">
          <div className="admin-form__title"><span>02</span><h2 id="admin-list-title">Publicaciones cargadas</h2></div>
          <label className="admin-list__search">
            <span>BUSCAR POR TÍTULO</span>
            <input type="search" value={titleSearch} onChange={(event) => setTitleSearch(event.target.value)} placeholder="Escribí el título de la publicación" />
          </label>
          {products.length === 0 && <p className="admin-list__empty">Todavía no hay productos cargados.</p>}
          {products.length > 0 && filteredProducts.length === 0 && <p className="admin-list__empty">No hay publicaciones que coincidan con “{titleSearch.trim()}”.</p>}
          <div className="admin-list__items">
            {filteredProducts.map((product) => (
              <article className={`admin-list__item${product.isActive ? '' : ' admin-list__item--inactive'}`} key={product.id}>
                {product.images[0] && <img src={product.images[0]} alt="" />}
                <div>
                  <span>#{product.id} · {productCategories.find((item) => item.slug === product.category)?.name || product.category}</span>
                  <p><strong>{product.title || `Producto #${product.id}`}</strong><br />{product.description}</p>
                  <small>${product.price.toLocaleString('es-AR')} · {product.quantity} UNIDADES</small><br />
                  <small>{product.isActive ? 'PUBLICADO' : product.quantity === 0 ? 'SIN STOCK · DADO DE BAJA' : 'DADO DE BAJA'}</small>
                </div>
                {product.isActive ? (
                  <div className="admin-list__actions">
                    <button type="button" disabled={managingProductId === product.id} onClick={() => deactivate(product)}>
                      {managingProductId === product.id ? 'PROCESANDO…' : 'DAR DE BAJA'}
                    </button>
                    <button className="admin-list__delete" type="button" disabled={managingProductId === product.id} onClick={() => removeProduct(product)}>BORRAR</button>
                  </div>
                ) : activatingProductId === product.id ? (
                  <form className="admin-list__activation" onSubmit={(event) => activate(event, product)}>
                    <label><span>NUEVO PRECIO</span><div className="admin-form__price"><b>$</b><input aria-label={`Nuevo precio de ${product.title}`} type="number" min="0" step="0.01" value={activationPrice} onChange={(event) => setActivationPrice(event.target.value)} required /></div></label>
                    <label><span>CANTIDAD</span><input aria-label={`Cantidad de ${product.title}`} type="number" min="1" step="1" value={activationQuantity} onChange={(event) => setActivationQuantity(event.target.value)} required /></label>
                    <div>
                      <button type="submit" disabled={managingProductId === product.id}>{managingProductId === product.id ? 'DANDO DE ALTA…' : 'CONFIRMAR ALTA'}</button>
                      <button type="button" onClick={() => setActivatingProductId(null)}>CANCELAR</button>
                    </div>
                  </form>
                ) : (
                  <div className="admin-list__actions">
                    <button type="button" onClick={() => openActivation(product)}>DAR DE ALTA</button>
                    <button className="admin-list__delete" type="button" disabled={managingProductId === product.id} onClick={() => removeProduct(product)}>BORRAR</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <form className="admin-form admin-users" onSubmit={createUser} noValidate>
          <div className="admin-form__title"><span>03</span><h2>Crear usuario administrador</h2></div>
          <p className="admin-users__help">El nuevo usuario podrá ingresar al panel y gestionar productos y administradores.</p>
          <label>
            <span>NOMBRE DE USUARIO</span>
            <input autoComplete="username" minLength={3} maxLength={32} pattern="[a-zA-Z0-9._-]+" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} required />
          </label>
          <div className="admin-form__row">
            <label>
              <span>CONTRASEÑA</span>
              <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required />
            </label>
            <label>
              <span>REPETIR CONTRASEÑA</span>
              <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={adminPasswordConfirmation} onChange={(event) => setAdminPasswordConfirmation(event.target.value)} required />
            </label>
          </div>
          {userMessage && <p className="admin-form__message" role="status">{userMessage}</p>}
          <button className="admin-form__submit" type="submit" disabled={creatingUser}>{creatingUser ? 'CREANDO…' : 'CREAR ADMINISTRADOR'} <span>→</span></button>

          {isPrimary && (
            <section className="admin-users__list" aria-labelledby="admin-users-list-title">
              <div className="admin-form__title"><span>04</span><h2 id="admin-users-list-title">Administradores registrados</h2></div>
              {adminUsers.length === 0 && <p className="admin-list__empty">Todavía no hay administradores adicionales.</p>}
              {adminUsers.map((user) => (
                <article className={`admin-users__item${user.isActive ? '' : ' admin-users__item--blocked'}`} key={user.id}>
                  <div><strong>{user.username}</strong><small>{user.isActive ? 'ACTIVO' : 'BLOQUEADO'}</small></div>
                  <div className="admin-users__actions">
                    <button type="button" disabled={managingUserId === user.id} onClick={() => updateUserStatus(user)}>{user.isActive ? 'BLOQUEAR' : 'REACTIVAR'}</button>
                    <button className="admin-users__delete" type="button" disabled={managingUserId === user.id} onClick={() => removeUser(user)}>ELIMINAR</button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </form>
      </main>
      <Footer />
    </div>
  )
}
