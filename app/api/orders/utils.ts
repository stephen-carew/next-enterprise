import { Order } from "@prisma/client"
import { redis } from "@/lib/redis"

interface OrderUpdate {
  type: string
  orderId?: string
  status?: string
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  order?: Order
}

export async function sendUpdate(update: OrderUpdate) {
  try {
    // Store update in Redis with timestamp
    await redis.zadd("order_updates", {
      score: Date.now(),
      member: JSON.stringify(update),
    })

    // Keep only last 1000 updates
    await redis.zremrangebyrank("order_updates", 0, -1001)

    // Publish update to Redis channel
    await redis.publish("orders:update", JSON.stringify(update))
  } catch (error) {
    console.error("Error sending order update:", error)
    // Don't throw the error, just log it
    // This ensures the main operation can continue even if the update fails
  }
}
