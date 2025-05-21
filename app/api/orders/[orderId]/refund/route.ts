import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { sendUpdate } from "../../utils"

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order is paid
    if (order.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Order is not paid" }, { status: 400 })
    }

    // Update order with refund status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "REFUNDED",
      },
      include: {
        table: true,
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
      },
    })

    try {
      // Store in Redis and publish update
      await redis.set(`order:${orderId}`, JSON.stringify(updatedOrder))
      await sendUpdate({
        type: "payment-update",
        orderId: orderId,
        paymentStatus: "REFUNDED",
        order: updatedOrder,
      })
    } catch (redisError) {
      console.error("Error updating Redis:", redisError)
      // Continue even if Redis update fails
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error processing refund:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
