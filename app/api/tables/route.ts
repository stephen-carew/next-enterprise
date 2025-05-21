import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const tables = await db.table.findMany({
      orderBy: {
        number: "asc",
      },
    })

    return NextResponse.json(tables)
  } catch (error) {
    console.error("Error fetching tables:", error)
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 })
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
