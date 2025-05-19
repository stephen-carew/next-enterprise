import { kv } from "@vercel/kv"
import { NextRequest, NextResponse } from "next/server"
import { db } from "../../../../lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const body = (await request.json()) as { status: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED" }
    const { status } = body
    const { orderId } = await params

    // Check if order exists
    const existingOrder = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      console.error(`Order not found: ${orderId}`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

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

    try {
      // Store in KV and publish update
      await kv.set(`orders:${orderId}`, updatedOrder)
      await kv.publish("orders:update", {
        orderId,
        status,
        order: updatedOrder,
      })
    } catch (kvError) {
      console.error("Error updating KV store:", kvError)
      // Continue even if KV update fails
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error updating order:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
