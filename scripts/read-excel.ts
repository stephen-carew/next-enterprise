import * as XLSX from "xlsx"

// Read the Excel file
const workbook = XLSX.readFile("pub_drinks_uk.xlsx")
if (!workbook.SheetNames.length) {
  throw new Error("No sheets found in the Excel file")
}
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName!]

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet!)

// Display the first row to see the structure
if (data.length > 0) {
  const firstRow = data[0] as Record<string, unknown>
  console.log("Excel file structure:")
  console.log(Object.keys(firstRow))
  console.log("\nFirst row data:")
  console.log(firstRow)
}
