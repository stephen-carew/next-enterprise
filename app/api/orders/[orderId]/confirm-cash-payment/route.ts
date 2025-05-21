import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { sendUpdate } from "../../utils"

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params

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

    // Check if order is already paid
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 })
    }

    // Generate a payment ID
    const paymentId = `CASH_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Update order with payment status and ID
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentId: paymentId,
        paymentMethod: "CASH",
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
        paymentStatus: "PAID",
        order: updatedOrder,
      })
    } catch (redisError) {
      console.error("Error updating Redis:", redisError)
      // Continue even if Redis update fails
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error confirming cash payment:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
