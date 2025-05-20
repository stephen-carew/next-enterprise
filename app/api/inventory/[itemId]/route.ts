import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { InventoryItem } from "@/lib/types"

type RouteContext = {
  params: Promise<{ itemId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    const { itemId } = await context.params

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = (await request.json()) as { quantity: number }
    const { quantity } = body

    if (typeof quantity !== "number") {
      return new NextResponse("Invalid quantity", { status: 400 })
    }

    const item = await prisma.inventoryItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        alerts: {
          where: {
            isResolved: false,
          },
        },
      },
    })

    if (!item) {
      return new NextResponse("Item not found", { status: 404 })
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity,
      },
    })

    // Check if we need to create or update an alert
    if (quantity <= item.minQuantity) {
      const existingAlert = item.alerts[0]

      if (existingAlert) {
        await prisma.inventoryAlert.update({
          where: {
            id: existingAlert.id,
          },
          data: {
            type: quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
            message: `${item.name} is ${
              quantity === 0 ? "out of stock" : "running low"
            }. Current quantity: ${quantity} ${item.unit}`,
          },
        })
      } else {
        await prisma.inventoryAlert.create({
          data: {
            inventoryItemId: item.id,
            type: quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
            message: `${item.name} is ${
              quantity === 0 ? "out of stock" : "running low"
            }. Current quantity: ${quantity} ${item.unit}`,
            isResolved: false,
          },
        })
      }
    } else {
      // If quantity is now above minimum, resolve any existing alerts
      for (const alert of item.alerts) {
        await prisma.inventoryAlert.update({
          where: {
            id: alert.id,
          },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json(updatedItem as InventoryItem)
  } catch (error) {
    console.error("[INVENTORY_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
