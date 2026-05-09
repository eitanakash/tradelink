import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { AdminLayout } from './components/AdminLayout'

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'))
  const [email, setEmail] = useState<string>(() => localStorage.getItem('adminEmail') || '')

  const handleLogin = (t: string, userEmail: string) => {
    localStorage.setItem('adminToken', t)
    localStorage.setItem('adminEmail', userEmail)
    setToken(t)
    setEmail(userEmail)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminEmail')
    setToken(null)
    setEmail('')
  }

  if (!token) return <LoginPage onLogin={handleLogin} />
  return <AdminLayout email={email} onLogout={handleLogout} />
}
