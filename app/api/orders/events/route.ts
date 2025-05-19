import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

export async function GET() {
  const encoder = new TextEncoder()
  const customReadable = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode("data: connected\n\n"))

      // Subscribe to order updates
      const subscriber = kv.subscribe("orders:*")
      subscriber.on("message", (message) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
      })

      // Handle client disconnect
      return () => {
        subscriber.unsubscribe()
      }
    },
  })

  return new NextResponse(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
