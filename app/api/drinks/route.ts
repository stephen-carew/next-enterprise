import { NextRequest, NextResponse } from "next/server"

import { db } from "../../../lib/db"
import { CreateDrinkRequest } from "../../../lib/types"

export async function GET() {
  try {
    const drinks = await db.drink.findMany({
      where: {
        isAvailable: true,
      },
      orderBy: {
        category: "asc",
      },
    })
    return NextResponse.json({ drinks })
  } catch (error) {
    console.error("Error fetching drinks:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDrinkRequest
    const drink = await db.drink.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        category: body.category,
        imageUrl: body.imageUrl,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(drink)
  } catch (error) {
    console.error("Failed to create drink:", error)
    return NextResponse.json({ error: "Failed to create drink" }, { status: 500 })
  }
}
