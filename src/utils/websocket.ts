import { base64ToUtf8 } from '.'

export default class WebSocketClient {
  private url: string
  private ws: WebSocket | null = null
  private readonly retryInterval: number
  private readonly pingInterval: number
  private pingIntervalId: NodeJS.Timeout | null = null

  constructor(url: string, retryInterval = 2000, pingInterval = 30000) {
    this.url = url
    this.retryInterval = retryInterval
    this.pingInterval = pingInterval
  }

  public connect(): void {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('Connected to WebSocket')
      this.startPinging()
    }

    this.ws.onmessage = (event) => {
      const res = event.data === 'ok' ? null : JSON.parse(event.data)
      if (res?.msg_type === 'Mempool') {
        res.data.ordinals.forEach((item: any) => {
          const inscription = base64ToUtf8(item.inscription_data.body)
          if (inscription?.endsWith('.bitmap'))
            console.log(
              `${inscription}: https://mempool.space/tx/${item.inscription_id}`
            )
        })
      }
    }

    this.ws.onerror = (error) => {
      console.error(`WebSocket error: ${error}`)
    }

    this.ws.onclose = (event) => {
      console.log(
        `WebSocket connection closed: ${event.code} - ${event.reason}`
      )
      this.stopPinging()
      setTimeout(() => this.connect(), this.retryInterval)
    }
  }

  private startPinging(): void {
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('{"type":"ping"}')
      }
    }, this.pingInterval)
  }

  private stopPinging(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId)
      this.pingIntervalId = null
    }
  }
}
