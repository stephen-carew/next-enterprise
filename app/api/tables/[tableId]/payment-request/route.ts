import { NextRequest, NextResponse } from "next/server"
import { db } from "../../../../../lib/db"
import { redis } from "../../../../../lib/redis"

export async function POST(request: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId } = await params

    // Get table and its active orders
    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
            },
          },
        },
      },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    // Calculate total amount
    const totalAmount = table.orders.reduce((sum, order) => sum + order.total, 0)

    // Create payment request
    const paymentRequest = await db.paymentRequest.create({
      data: {
        tableId,
        amount: totalAmount,
        status: "PENDING",
      },
    })

    // Notify bartender through Redis
    await redis.publish("payment-requests", {
      type: "new",
      paymentRequestId: paymentRequest.id,
      tableId,
      amount: totalAmount,
    })

    return NextResponse.json(paymentRequest)
  } catch (error) {
    console.error("Error creating payment request:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
