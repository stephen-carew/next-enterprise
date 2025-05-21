import { SignJWT } from "jose"
import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"

const JWT_SECRET = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret-key")

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get("tableId")

    if (!tableId) {
      return NextResponse.json({ error: "Table ID is required" }, { status: 400 })
    }

    // Verify table exists
    const table = await db.table.findUnique({
      where: { id: tableId },
    })

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    // Generate a permanent token for the table
    const token = await new SignJWT({
      tableId: table.id,
      tableNumber: table.number,
      type: "permanent", // Mark this as a permanent token
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .sign(JWT_SECRET)

    // Store the permanent token in Redis
    await redis.set(`table:${table.id}:permanent_token`, token, {
      ex: 365 * 24 * 60 * 60, // 1 year expiration for the Redis key
    })

    // Generate QR code with the token
    const qrCode = await QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })

    return NextResponse.json({ qrCode })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
