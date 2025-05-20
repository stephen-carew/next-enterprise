import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { InventoryItem } from "@/lib/types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const inventory = await prisma.inventoryItem.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        alerts: {
          where: {
            isResolved: false,
          },
        },
      },
    })

    return NextResponse.json(inventory as InventoryItem[])
  } catch (error) {
    console.error("[INVENTORY_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = (await req.json()) as Partial<InventoryItem>
    const { name, description, quantity, unit, minQuantity, category, supplier, price } = body

    if (
      !name ||
      typeof quantity !== "number" ||
      !unit ||
      typeof minQuantity !== "number" ||
      !category ||
      typeof price !== "number"
    ) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        name,
        description,
        quantity,
        unit,
        minQuantity,
        category,
        supplier,
        price,
      },
    })

    // Check if we need to create an alert
    if (quantity <= minQuantity) {
      await prisma.inventoryAlert.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
          message: `${name} is ${
            quantity === 0 ? "out of stock" : "running low"
          }. Current quantity: ${quantity} ${unit}`,
          isResolved: false,
        },
      })
    }

    return NextResponse.json(inventoryItem as InventoryItem)
  } catch (error) {
    console.error("[INVENTORY_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
