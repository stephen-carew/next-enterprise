import { Order } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

interface OrderUpdate {
  type: string
  orderId?: string
  status?: string
  order?: Order
}

export async function GET(request: NextRequest) {
  try {
    // Set SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`)

        let lastUpdate = Date.now()
        const pollInterval = 1000 // Poll every second

        const pollForUpdates = async () => {
          try {
            // Get all order updates since last check
            const updates = (await redis.zrange("order_updates", lastUpdate, "+inf", { byScore: true })) as string[]

            for (const update of updates) {
              try {
                // The update is already a stringified object, so we can use it directly
                controller.enqueue(`data: ${update}\n\n`)
              } catch (error) {
                console.error("Error processing update:", error)
              }
            }

            lastUpdate = Date.now()
          } catch (error) {
            console.error("Error polling for updates:", error)
          }
        }

        // Start polling
        const intervalId = setInterval(pollForUpdates, pollInterval)

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(intervalId)
          controller.close()
        })
      },
    })

    return new NextResponse(stream, { headers })
  } catch (error) {
    console.error("Error in SSE endpoint:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderUpdate

    // Store update in Redis with timestamp
    await redis.zadd("order_updates", {
      score: Date.now(),
      member: JSON.stringify(body),
    })

    // Keep only last 1000 updates
    await redis.zremrangebyrank("order_updates", 0, -1001)

    return new NextResponse("Update sent", { status: 200 })
  } catch (error) {
    console.error("Error sending update:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
