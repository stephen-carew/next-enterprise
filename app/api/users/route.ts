import { hash } from "bcrypt"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const {
      email,
      password,
      role = "BARTENDER",
    } = (await request.json()) as { email: string; password: string; role?: string }

    if (!email || !password) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return new NextResponse("User already exists", { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error creating user:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
