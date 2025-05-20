import { kv } from "@vercel/kv"
import { NextRequest, NextResponse } from "next/server"
import { db } from "../../../../lib/db"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId } = await params
    const body = (await request.json()) as { status: "CONFIRMED" | "REJECTED" }
    const { status } = body

    // Update payment request
    const paymentRequest = await db.paymentRequest.update({
      where: { id: requestId },
      data: { status },
    })

    if (status === "CONFIRMED") {
      // Update all active orders for this table to COMPLETED
      await db.order.updateMany({
        where: {
          tableId: paymentRequest.tableId,
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        data: { status: "COMPLETED" },
      })

      // Notify through KV store
      await kv.publish("orders:update", {
        type: "payment-confirmed",
        tableId: paymentRequest.tableId,
      })
    }

    return NextResponse.json(paymentRequest)
  } catch (error) {
    console.error("Error updating payment request:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
