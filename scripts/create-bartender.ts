import { PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.BARTENDER_EMAIL || "bartender@example.com"
  const password = process.env.BARTENDER_PASSWORD || "bartender123"

  const hashedPassword = await hash(password, 10)

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "BARTENDER",
      },
      create: {
        email,
        password: hashedPassword,
        role: "BARTENDER",
      },
    })

    console.log("Bartender user created/updated:", user.email)
  } catch (error) {
    console.error("Error creating bartender user:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
