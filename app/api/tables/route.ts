import { NextResponse } from "next/server"
import { db } from "../../../lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { number } = body as { number: number }

    // Try to find existing table
    let table = await db.table.findUnique({
      where: { number },
    })

    // If table doesn't exist, create it
    if (!table) {
      table = await db.table.create({
        data: { number },
      })
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error("Failed to get/create table:", error)
    return NextResponse.json({ error: "Failed to get/create table" }, { status: 500 })
  }
}
