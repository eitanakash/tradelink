export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function getToken() {
  return localStorage.getItem('adminToken')
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  return res
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiFetch('/account/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to change password')
  }
  return res.json()
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const res = await apiFetch('/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId, newPassword }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to reset password')
  }
  return res.json()
}
