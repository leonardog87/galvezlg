import { useEffect, useState, type FormEvent } from 'react'
import galvezLogo from '../../assets/Galvez_logo.webp'
import './LoginPage.css'

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (!token) return
    fetch(`${apiBase}/api/auth/session`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (response.ok) window.location.replace('/administrar-productos')
        else sessionStorage.removeItem('adminToken')
      })
      .catch(() => undefined)
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const responseText = await response.text()
      const result = responseText ? JSON.parse(responseText) : {}
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión')
      sessionStorage.setItem('adminToken', result.token)
      window.location.replace('/administrar-productos')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <a className="login-card__brand" href="/" aria-label="Volver al inicio">
          <img src={galvezLogo} alt="Gálvez" />
        </a>
        <span className="login-card__eyebrow">ACCESO RESTRINGIDO</span>
        <h1>Panel de<br /><em>administración.</em></h1>
        <p>Ingresá tus credenciales para gestionar el catálogo.</p>
        <form onSubmit={handleSubmit}>
          <label><span>USUARIO</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus /></label>
          <label><span>CONTRASEÑA</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {message && <p className="login-card__message" role="alert">{message}</p>}
          <button type="submit" disabled={loading}>{loading ? 'INGRESANDO…' : 'INGRESAR'} <span>→</span></button>
        </form>
      </section>
    </main>
  )
}
