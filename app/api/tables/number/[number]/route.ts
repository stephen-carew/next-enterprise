import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{ number: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { number } = await context.params
    const tableNumber = parseInt(number)

    if (isNaN(tableNumber)) {
      return new NextResponse("Invalid table number", { status: 400 })
    }

    const table = await db.table.findUnique({
      where: { number: tableNumber },
    })

    if (!table) {
      return new NextResponse("Table not found", { status: 404 })
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error("Error fetching table:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
