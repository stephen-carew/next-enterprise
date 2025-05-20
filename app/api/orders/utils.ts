import { Order } from "@prisma/client"
import { redis } from "@/lib/redis"

interface OrderUpdate {
  type: string
  orderId?: string
  status?: string
  order?: Order
}

export async function sendUpdate(update: OrderUpdate) {
  try {
    await redis.publish("orders:update", update)
  } catch (error) {
    console.error("Error sending order update:", error)
  }
}
