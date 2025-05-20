import { NextRequest, NextResponse } from "next/server"
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { number: number }
    const { number } = body

    // Check for existing table with the same number
    const existingTable = await db.table.findUnique({
      where: { number },
    })
    if (existingTable) {
      return NextResponse.json({ error: "A table with this number already exists." }, { status: 400 })
    }

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
