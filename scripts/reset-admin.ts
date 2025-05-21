import { PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@bartender.com"
  const newPassword = "admin123" // Set this to a known value

  const hashedPassword = await hash(newPassword, 10)

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "ADMIN",
      },
      create: {
        email,
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    console.log("Admin user password reset:", {
      email: user.email,
      role: user.role,
      newPassword, // Log the plain text password for testing
    })
  } catch (error) {
    console.error("Error resetting admin password:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
