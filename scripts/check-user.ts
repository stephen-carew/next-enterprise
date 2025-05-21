import { PrismaClient } from "@prisma/client"
import { compare } from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error("Please provide email and password as arguments")
    console.error("Usage: pnpm tsx scripts/check-user.ts <email> <password>")
    process.exit(1)
  }

  try {
    console.log("Checking user:", email)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error("User not found in database")
      process.exit(1)
    }

    console.log("User found:", {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })

    const isPasswordValid = await compare(password, user.password)
    console.log("Password valid:", isPasswordValid)

    if (!isPasswordValid) {
      console.log("Stored password hash:", user.password)
    }
  } catch (error) {
    console.error("Error checking user:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
