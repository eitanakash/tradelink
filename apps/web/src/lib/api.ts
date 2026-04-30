export const API_URL = 'http://localhost:3000'

// Intercept 401 responses and fire a global event so App.tsx can log the user out
const _fetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const res = await _fetch(input, init)
  if (res.status === 401) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (url.startsWith(API_URL)) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
  }
  return res
}
