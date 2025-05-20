import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    const { userId } = await context.params

    if (!session || session.user?.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Prevent deleting the last admin
    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      })

      if (adminCount <= 1) {
        return new NextResponse("Cannot delete the last admin", { status: 400 })
      }
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting user:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
