import { NextResponse } from "next/server"
import { db } from "../../../lib/db"

export async function GET() {
  try {
    const tables = await db.table.findMany({
      include: {
        orders: {
          where: {
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
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

    // Calculate total owed for each table
    const tablesWithTotals = tables.map((table) => ({
      ...table,
      totalOwed: table.orders.reduce((sum, order) => sum + order.total, 0),
    }))

    return NextResponse.json(tablesWithTotals)
  } catch (error) {
    console.error("Error fetching tables:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { number: number }
    const { number } = body

    const table = await db.table.create({
      data: {
        number,
        status: "ACTIVE",
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("Error creating table:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
