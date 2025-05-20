import { NextRequest, NextResponse } from "next/server"
import { db } from "../../../../../lib/db"

export async function GET(_request: NextRequest, context: { params: Promise<{ number: string }> }) {
  try {
    const params = await context.params
    const tableNumber = parseInt(params.number, 10)
    if (isNaN(tableNumber)) {
      return NextResponse.json({ error: "Invalid table number" }, { status: 400 })
    }
    const table = await db.table.findUnique({
      where: { number: tableNumber },
    })
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }
    return NextResponse.json(table)
  } catch (error) {
    console.error("Error fetching table by number:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
