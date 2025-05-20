import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{ tableId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tableId } = await context.params

    const table = await db.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: {
              in: ["PENDING", "PREPARING"],
            },
          },
          include: {
            OrderDrink: {
              include: {
                Drink: true,
              },
            },
          },
        },
      },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    const hasActiveOrders = table.orders.length > 0

    return NextResponse.json({
      table,
      hasActiveOrders,
      activeOrders: table.orders,
    })
  } catch (error) {
    console.error("Error fetching table:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
