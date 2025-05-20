import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Order, Table } from "@/types/table"

interface TableWithOrders extends Table {
  orders: Order[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const number = searchParams.get("number")
    const id = searchParams.get("id")

    if (!number && !id) {
      return new NextResponse("Missing table identifier", { status: 400 })
    }

    let table: TableWithOrders | null
    if (number) {
      const tableNumber = parseInt(number)
      if (isNaN(tableNumber)) {
        return new NextResponse("Invalid table number", { status: 400 })
      }

      // Try to find existing table
      table = (await db.table.findUnique({
        where: { number: tableNumber },
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
      })) as TableWithOrders | null

      // If table doesn't exist, create it
      if (!table) {
        table = (await db.table.create({
          data: {
            number: tableNumber,
            status: "ACTIVE",
          },
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
        })) as TableWithOrders
      }
    } else if (id) {
      table = (await db.table.findUnique({
        where: { id },
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
      })) as TableWithOrders | null

      if (!table) {
        return new NextResponse("Table not found", { status: 404 })
      }
    } else {
      return new NextResponse("Invalid table identifier", { status: 400 })
    }

    const hasActiveOrders = table.orders.length > 0

    return NextResponse.json({
      table,
      hasActiveOrders,
      activeOrders: table.orders,
    })
  } catch (error) {
    console.error("Error fetching/creating table:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
