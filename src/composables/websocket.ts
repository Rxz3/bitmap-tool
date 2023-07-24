import { onMounted, onUnmounted, ref } from 'vue'

interface SocketOptions {
  url: string
  retryTimeout?: number
  pingInterval?: number
  pingMessage?: string
}

export function useWebSocket({
  url,
  retryTimeout = 2000,
  pingInterval = 10000,
  pingMessage = 'ping',
}: SocketOptions) {
  const ws = ref<WebSocket | null>(null)
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null
  let pingIntervalId: ReturnType<typeof setInterval> | null = null

  const connect = () => {
    ws.value = new WebSocket(url)
    ws.value.onopen = () => {
      // eslint-disable-next-line no-console
      console.log('Connected to WebSocket')

      if (retryTimeoutId) {
        clearTimeout(retryTimeout)
        retryTimeoutId = null
      }

      pingIntervalId = setInterval(() => {
        if (ws.value?.readyState === WebSocket.OPEN) {
          ws.value.send(pingMessage)
        }
      }, pingInterval)
    }

    ws.value.onclose = (event) => {
      console.warn(
        `WebSocket connection closed: ${event.code} - ${event.reason}`
      )
      if (pingIntervalId) {
        clearInterval(pingIntervalId)
        pingIntervalId = null
      }

      retryTimeoutId = setTimeout(() => connect(), retryTimeout)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error occurred:', error)
    }
  }

  onMounted(connect)

  onUnmounted(() => {
    ws.value?.close()

    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId)
    }

    if (pingIntervalId) {
      clearInterval(pingIntervalId)
    }
  })

  return ws
}
