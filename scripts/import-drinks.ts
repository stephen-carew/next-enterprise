import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"

const prisma = new PrismaClient()

interface ExcelDrink {
  Category: string
  Drink: string
  Size: string
  "Avg Price (£)": number
}

async function importDrinks() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile("pub_drinks_uk.xlsx")
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error("No sheets found in the Excel file")
    }
    const data = XLSX.utils.sheet_to_json<ExcelDrink>(workbook.Sheets[firstSheetName]!)

    console.log(`Found ${data.length} drinks in the Excel file`)

    // Process each drink
    for (const row of data) {
      // Map Excel columns to our schema
      const drinkData = {
        name: row.Drink,
        description: `${row.Drink} (${row.Size})`,
        price: row["Avg Price (£)"],
        category: row.Category,
        imageUrl: null, // We don't have image URLs in the Excel file
        isAvailable: true,
      }

      // Create the drink in the database
      await prisma.drink.create({
        data: drinkData,
      })
    }

    console.log("Successfully imported all drinks")
  } catch (error) {
    console.error("Error importing drinks:", error)
  } finally {
    await prisma.$disconnect()
  }
}

importDrinks()
