import { jwtVerify } from "jose"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { redis } from "@/lib/redis"

const JWT_SECRET = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret-key")
const RATE_LIMIT_WINDOW = 60 // 1 minute
const MAX_ATTEMPTS = 5 // 5 attempts per minute
const SESSION_DURATION = 6 * 60 * 60 // 6 hours in seconds

type VerifyRequest = {
  token: string
}

type SessionData = {
  token: string
  createdAt: string
  ip: string
  lastAccess: string
  accessCount: number
}

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting and tracking
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const rateLimitKey = `rate_limit:${ip}`

    // Check rate limit
    const attempts = await redis.incr(rateLimitKey)
    if (attempts === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW)
    }

    if (attempts > MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }

    const { token } = (await request.json()) as VerifyRequest

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Verify table exists
    const table = await db.table.findUnique({
      where: { id: payload.tableId as string },
    })

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    // Check if this is a permanent token
    const permanentToken = await redis.get<string>(`table:${table.id}:permanent_token`)
    if (permanentToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get or create session data
    const sessionKey = `table:${table.id}:session`
    const existingSession = await redis.get<string>(sessionKey)
    let sessionData: SessionData

    if (existingSession) {
      try {
        sessionData =
          typeof existingSession === "string"
            ? (JSON.parse(existingSession) as SessionData)
            : (existingSession as SessionData)

        // Update session data
        sessionData.lastAccess = new Date().toISOString()
        sessionData.accessCount += 1
        sessionData.ip = ip // Update IP in case it changed
      } catch (error) {
        console.error("Error parsing session data:", error)
        // Invalid session data, create new session
        sessionData = {
          token,
          createdAt: new Date().toISOString(),
          ip,
          lastAccess: new Date().toISOString(),
          accessCount: 1,
        }
      }
    } else {
      // Create new session
      sessionData = {
        token,
        createdAt: new Date().toISOString(),
        ip,
        lastAccess: new Date().toISOString(),
        accessCount: 1,
      }
    }

    // Store updated session data
    await redis.set(sessionKey, JSON.stringify(sessionData), {
      ex: SESSION_DURATION, // 6 hours
    })

    // Log suspicious activity
    if (sessionData.accessCount > 100) {
      // More than 100 accesses in 6 hours
      console.warn(`Suspicious activity detected for table ${table.id}:`, {
        accessCount: sessionData.accessCount,
        ip: sessionData.ip,
        lastAccess: sessionData.lastAccess,
      })
    }

    return NextResponse.json({ tableId: table.id })
  } catch (error) {
    console.error("Error verifying token:", error)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}
