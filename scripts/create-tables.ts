import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function createTables() {
  try {
    // Create tables 1-10
    for (let i = 1; i <= 10; i++) {
      await prisma.table.create({
        data: {
          number: i,
        },
      })
      console.log(`Created table ${i}`)
    }

    console.log("Successfully created all tables")
  } catch (error) {
    console.error("Error creating tables:", error)
  } finally {
    await prisma.$disconnect()
  }
}

createTables()
