import { NextResponse } from "next/server"
import { db } from "@/lib/db"

interface OrderItem {
  drinkId: string
  quantity: number
}

interface CreateOrderRequest {
  items: OrderItem[]
}

export async function POST(request: Request, { params }: { params: { tableId: string } }) {
  try {
    const body = (await request.json()) as CreateOrderRequest
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return new NextResponse("Invalid request body", { status: 400 })
    }

    // Calculate total price
    let total = 0
    for (const item of items) {
      const drink = await db.drink.findUnique({
        where: { id: item.drinkId },
      })
      if (!drink) {
        return new NextResponse(`Drink not found: ${item.drinkId}`, { status: 404 })
      }
      total += drink.price * item.quantity
    }

    // Create order with order drinks
    const order = await db.order.create({
      data: {
        tableId: params.tableId,
        total,
        OrderDrink: {
          create: items.map((item) => ({
            drinkId: item.drinkId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        OrderDrink: {
          include: {
            Drink: true,
          },
        },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error creating order:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
