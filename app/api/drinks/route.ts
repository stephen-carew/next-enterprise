import { NextResponse } from "next/server"

import { db } from "../../../lib/db"
import { CreateDrinkRequest } from "../../../lib/types"

export async function GET() {
  try {
    const drinks = await db.drink.findMany({
      where: {
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
    console.log("Found drinks:", drinks)
    return NextResponse.json(drinks)
  } catch (error) {
    console.error("Failed to fetch drinks:", error)
    return NextResponse.json({ error: "Failed to fetch drinks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
