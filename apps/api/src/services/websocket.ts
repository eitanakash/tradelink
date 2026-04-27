import type { WebSocket } from 'ws'

class WebSocketManager {
  private connections = new Map<string, Set<WebSocket>>()

  add(userId: string, ws: WebSocket) {
    if (!this.connections.has(userId)) this.connections.set(userId, new Set())
    this.connections.get(userId)!.add(ws)
  }

  remove(userId: string, ws: WebSocket) {
    const conns = this.connections.get(userId)
    if (conns) {
      conns.delete(ws)
      if (conns.size === 0) this.connections.delete(userId)
    }
  }

  isOnline(userId: string): boolean {
    const conns = this.connections.get(userId)
    return !!(conns && conns.size > 0)
  }

  send(userId: string, type: string, data: unknown) {
    const conns = this.connections.get(userId)
    if (!conns) return
    const payload = JSON.stringify({ type, data })
    for (const ws of conns) {
      try {
        ws.send(payload)
      } catch {
        // socket may have closed
      }
    }
  }
}

export const wsManager = new WebSocketManager()
