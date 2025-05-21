import { jwtVerify } from "jose"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withAuth } from "next-auth/middleware"
import type { NextRequestWithAuth } from "next-auth/middleware"
import { redis } from "@/lib/redis"

const JWT_SECRET = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret-key")

type SessionData = {
  token: string
  createdAt: string
  ip: string
  lastAccess: string
  accessCount: number
}

// Table session middleware
export async function tableSessionMiddleware(request: NextRequest) {
  // Skip QR code generation and lookup endpoints
  if (request.nextUrl.pathname === "/api/tables/qr" || request.nextUrl.pathname === "/api/tables/lookup") {
    return NextResponse.next()
  }

  // Only protect table-related routes
  if (!request.nextUrl.pathname.startsWith("/tables/")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("table_session")?.value
  console.log("Middleware checking session for path:", request.nextUrl.pathname)
  console.log("Session token present:", !!token)

  if (!token) {
    console.log("No session token found, redirecting to scan")
    return NextResponse.redirect(new URL("/scan", request.url))
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log("Token verified, payload:", payload)

    // Check if this is a permanent token
    const permanentToken = await redis.get<string>(`table:${payload.tableId}:permanent_token`)
    if (permanentToken !== token) {
      throw new Error("Invalid token")
    }

    // Check if session exists in Redis
    const session = await redis.get<string>(`table:${payload.tableId}:session`)
    console.log("Redis session found:", !!session)

    if (!session) {
      console.log("No Redis session found, redirecting to scan")
      throw new Error("No session found")
    }

    try {
      // Handle both string and object session data
      const sessionData = typeof session === "string" ? (JSON.parse(session) as SessionData) : (session as SessionData)

      console.log("Session data:", sessionData)

      // Check for suspicious activity
      const accessCount = sessionData.accessCount || 0
      const lastAccess = new Date(sessionData.lastAccess)
      const now = new Date()
      const hoursSinceLastAccess = (now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60)

      if (accessCount > 100 && hoursSinceLastAccess < 24) {
        console.warn("Suspicious activity detected:", {
          tableId: payload.tableId,
          accessCount,
          lastAccess: sessionData.lastAccess,
          ip: sessionData.ip,
        })
      }

      // Add table info to request headers for use in API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-table-id", payload.tableId as string)
      requestHeaders.set("x-table-number", payload.tableNumber as string)

      console.log("Session valid, proceeding to:", request.nextUrl.pathname)
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error("Error handling session data:", error)
      throw new Error("Invalid session data")
    }
  } catch (error) {
    // Clear invalid session cookie
    console.error("Invalid session:", error)
    const response = NextResponse.redirect(new URL("/scan", request.url))
    response.cookies.set("table_session", "", {
      path: "/",
      domain: request.headers.get("host") || undefined,
      secure: true,
      sameSite: "strict",
      maxAge: 0,
    })
    return response
  }
}

// Combined middleware
export default withAuth(
  async function middleware(request: NextRequestWithAuth) {
    // Handle auth routes
    if (
      request.nextUrl.pathname.startsWith("/bartender") ||
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/api/orders") ||
      request.nextUrl.pathname.startsWith("/api/payment-requests")
    ) {
      return NextResponse.next()
    }

    // Handle table routes
    return tableSessionMiddleware(request)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/tables/:path*",
    "/api/tables/qr",
    "/api/tables/verify",
    "/api/tables/by-id/:path*",
    "/api/tables/by-number/:path*",
    "/api/tables/number/:path*",
    "/api/tables/:tableId/orders",
    "/api/tables/:tableId/payment-request",
    "/bartender/:path*",
    "/admin/:path*",
    "/api/orders/:path*",
    "/api/payment-requests/:path*",
  ],
}
