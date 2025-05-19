import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

export async function GET() {
  const encoder = new TextEncoder()
  const customReadable = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "connected" }) + "\n\n"))

      // Subscribe to both specific order updates and general updates
      const subscribers = [kv.subscribe("orders:update"), kv.subscribe("orders:*")]

      // Handle messages from all subscribers
      subscribers.forEach((subscriber) => {
        subscriber.on("message", (message) => {
          try {
            // Ensure the message is properly formatted
            const data = typeof message === "string" ? JSON.parse(message) : message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (error) {
            console.error("Error processing SSE message:", error)
          }
        })
      })

      // Handle client disconnect
      return () => {
        subscribers.forEach((subscriber) => subscriber.unsubscribe())
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
