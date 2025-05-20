import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { number: string } }) {
  try {
    const tableNumber = parseInt(params.number)

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
