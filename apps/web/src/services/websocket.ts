type Handler = (data: unknown) => void

class WSClient {
  private ws: WebSocket | null = null
  private token: string | null = null
  private handlers: Map<string, Set<Handler>> = new Map()

  connect(token: string) {
    this.token = token
    this.openSocket()
  }

  private openSocket() {
    if (!this.token) return
    const url = `ws://localhost:3000/ws?token=${this.token}`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        const set = this.handlers.get(type)
        if (set) set.forEach((h) => h(data))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      if (this.token) {
        setTimeout(() => this.openSocket(), 4000)
      }
    }
  }

  disconnect() {
    this.token = null
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => {
      this.handlers.get(event)?.delete(handler)
    }
  }
}

export const wsClient = new WSClient()
