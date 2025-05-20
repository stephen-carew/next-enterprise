import { NextResponse } from "next/server"
import { db } from "../../../lib/db"

export async function GET() {
  try {
    const paymentRequests = await db.paymentRequest.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(paymentRequests)
  } catch (error) {
    console.error("Error fetching payment requests:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
