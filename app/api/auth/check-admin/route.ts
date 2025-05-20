import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden - Admin access required", { status: 403 })
    }

    return new NextResponse("Authorized - Admin access granted", { status: 200 })
  } catch (error) {
    console.error("Auth check error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
