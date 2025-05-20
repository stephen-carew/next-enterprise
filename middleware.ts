import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isBartenderRoute = req.nextUrl.pathname.startsWith("/bartender")
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
    const isApiRoute =
      req.nextUrl.pathname.startsWith("/api/orders") || req.nextUrl.pathname.startsWith("/api/payment-requests")

    // If it's a bartender route or API route
    if (isBartenderRoute || isApiRoute) {
      // Allow access if user is either a BARTENDER or ADMIN
      if (token?.role !== "BARTENDER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // If it's an admin route, only allow ADMIN role
    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect these routes
export const config = {
  matcher: ["/bartender/:path*", "/admin/:path*", "/api/orders/:path*", "/api/payment-requests/:path*"],
}
