import { Order } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { sendUpdate } from "../utils"

interface OrderUpdate {
  type: string
  orderId?: string
  status?: string
  order?: Order
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return new NextResponse("Order ID is required", { status: 400 })
    }

    // Get order from Redis
    const order = await redis.get(`orders:${orderId}`)

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderUpdate
    await sendUpdate(body)
    return new NextResponse("Update sent", { status: 200 })
  } catch (error) {
    console.error("Error sending update:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
