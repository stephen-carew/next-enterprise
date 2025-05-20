import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"
import { sendUpdate } from "../utils"

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
    const { orderId } = await params
    const body = (await request.json()) as {
      status?: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED"
      items?: Array<{ drinkId: string; quantity: number; price: number }>
    }
    const { status, items } = body

    // Check if order exists
    const existingOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        OrderDrink: true,
      },
    })

    if (!existingOrder) {
      console.error(`Order not found: ${orderId}`)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: { status?: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED" } = {}
    if (status) {
      updateData.status = status
    }

    // Update order in database
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        ...updateData,
        ...(items && {
          // Delete existing order drinks
          OrderDrink: {
            deleteMany: {},
            // Create new order drinks
            create: items.map((item) => ({
              drinkId: item.drinkId,
              quantity: item.quantity,
            })),
          },
          // Update total
          total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        }),
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

    // If the order is now COMPLETED or CANCELLED, check if all orders for the table are done
    if (status === "COMPLETED" || status === "CANCELLED") {
      const activeOrders = await db.order.count({
        where: {
          tableId: updatedOrder.tableId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      })
      if (activeOrders === 0) {
        await db.table.update({
          where: { id: updatedOrder.tableId },
          data: { status: "AVAILABLE" },
        })
      }
    }

    try {
      // Store in Redis and publish update
      await redis.set(`orders:${orderId}`, updatedOrder)

      // Publish both specific order update and general update
      await Promise.all([
        // Publish specific order update
        redis.publish(`orders:${orderId}`, {
          orderId,
          status: updatedOrder.status,
          order: updatedOrder,
        }),
        // Publish general update for all clients
        redis.publish("orders:update", {
          orderId,
          status: updatedOrder.status,
          order: updatedOrder,
        }),
      ])

      console.log("Published order updates:", {
        orderId,
        status: updatedOrder.status,
        timestamp: new Date().toISOString(),
      })
    } catch (redisError) {
      console.error("Error updating Redis store:", redisError)
      // Continue even if Redis update fails
    }

    // Broadcast the update to all connected clients
    await sendUpdate({
      type: "order-update",
      orderId,
      status: updatedOrder.status,
      order: updatedOrder,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Error updating order:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
