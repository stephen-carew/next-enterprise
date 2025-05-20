import { NextResponse } from "next/server"
import { Order } from "@/types/table"

interface SSEUpdate {
  type?: "connected" | "new-order"
  orderId?: string
  status?: Order["status"]
  order?: Order
}

// Store active SSE connections
const clients = new Set<ReadableStreamDefaultController>()

// Broadcast message to all connected clients
function broadcast(message: SSEUpdate) {
  const data = `data: ${JSON.stringify(message)}\n\n`
  clients.forEach((client) => {
    try {
      client.enqueue(new TextEncoder().encode(data))
    } catch (error) {
      console.error("Error sending message to client:", error)
      clients.delete(client)
    }
  })
}

// Public function to send updates
export function sendUpdate(message: SSEUpdate) {
  broadcast(message)
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Add client to set
      clients.add(controller)

      // Send initial connection message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // Remove client when connection closes
      return () => {
        clients.delete(controller)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
