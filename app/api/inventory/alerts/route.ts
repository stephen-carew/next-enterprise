import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { InventoryAlert } from "@/lib/types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const alerts = await prisma.inventoryAlert.findMany({
      where: {
        isResolved: false,
      },
      include: {
        inventoryItem: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(alerts as InventoryAlert[])
  } catch (error) {
    console.error("[ALERTS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
