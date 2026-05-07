type Handler = (data: unknown) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<Handler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private intentionalClose = false
  private token: string | null = null

  connect(token: string) {
    this.token = token
    this.intentionalClose = false
    this.reconnectDelay = 1000
    this._connect()
  }

  private _connect() {
    if (!this.token) return
    try {
      const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000')
        .replace('https://', 'wss://')
        .replace('http://', 'ws://')
      this.ws = new WebSocket(`${base}/ws?token=${this.token}`)
    } catch {
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data as string)
        this.handlers.get(type)?.forEach((h) => h(data))
        this.handlers.get('*')?.forEach((h) => h({ type, data }))
      } catch {}
    }

    this.ws.onclose = () => {
      if (!this.intentionalClose) this._scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this._connect()
    }, this.reconnectDelay)
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this.token = null
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler)
  }
}

export const wsClient = new WSClient()
