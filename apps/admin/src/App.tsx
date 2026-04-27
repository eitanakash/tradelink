import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { AdminLayout } from './components/AdminLayout'

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'))

  const handleLogin = (t: string) => {
    localStorage.setItem('adminToken', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setToken(null)
  }

  if (!token) return <LoginPage onLogin={handleLogin} />
  return <AdminLayout onLogout={handleLogout} />
}
