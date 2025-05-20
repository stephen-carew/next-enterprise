import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { InventoryAlert } from "@/lib/types"

type RouteContext = {
  params: Promise<{ alertId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    const { alertId } = await context.params

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = (await request.json()) as { isResolved: boolean }
    const { isResolved } = body

    if (typeof isResolved !== "boolean") {
      return new NextResponse("Invalid isResolved value", { status: 400 })
    }

    const alert = await prisma.inventoryAlert.findUnique({
      where: {
        id: alertId,
      },
      include: {
        inventoryItem: true,
      },
    })

    if (!alert) {
      return new NextResponse("Alert not found", { status: 404 })
    }

    const updatedAlert = await prisma.inventoryAlert.update({
      where: {
        id: alertId,
      },
      data: {
        isResolved,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        inventoryItem: true,
      },
    })

    return NextResponse.json(updatedAlert as InventoryAlert)
  } catch (error) {
    console.error("[ALERT_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
