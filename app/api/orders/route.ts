import { NextRequest, NextResponse } from "next/server"
import { sendUpdate } from "./events/route"
import { db } from "../../../lib/db"
import { redis } from "../../../lib/redis"
import { CreateOrderRequest } from "../../../lib/types"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderRequest
    const { tableId, items } = body

    if (!tableId) {
      return new NextResponse("Table ID is required", { status: 400 })
    }

    if (!items || items.length === 0) {
      return new NextResponse("Order items are required", { status: 400 })
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Create order with OrderDrink entries
    const order = await db.order.create({
      data: {
        tableId,
        status: "PENDING",
        total,
        OrderDrink: {
          create: items.map((item) => ({
            drinkId: item.drinkId,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
        table: true,
      },
    })

    // Store in Redis and publish update
    await redis.set(`orders:${order.id}`, order)
    await redis.publish("orders:update", {
      type: "new-order",
      order,
    })

    // Broadcast the new order to all connected clients
    sendUpdate({
      type: "new-order",
      orderId: order.id,
      status: order.status,
      order,
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[ORDERS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: {
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
        table: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[ORDERS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
