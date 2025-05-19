import { kv } from "@vercel/kv"
import { NextRequest, NextResponse } from "next/server"
import { db } from "../../../../lib/db"

export async function GET(req: NextRequest, context: { params: { orderId: string } }) {
  try {
    const { orderId } = context.params

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
        table: true,
      },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Failed to fetch order:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: { params: { orderId: string } }) {
  try {
    const body = (await req.json()) as { status: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED" }
    const { status } = body
    const { orderId } = context.params

    // Update order in database
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        table: true,
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
      },
    })

    // Store in KV and publish update
    await kv.set(`orders:${orderId}`, updatedOrder)
    await kv.publish("orders:update", {
      orderId,
      status,
      order: updatedOrder,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
