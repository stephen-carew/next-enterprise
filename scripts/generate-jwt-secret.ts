import { randomBytes } from "crypto"

// Generate a random 32-byte (256-bit) secret
const secret = randomBytes(32).toString("base64")

console.log("\nGenerated JWT Secret:")
console.log("====================")
console.log(secret)
console.log("\nAdd this to your .env file as:")
console.log("NEXT_PUBLIC_JWT_SECRET=" + secret)
console.log("\nMake sure to keep this secret secure and never commit it to version control!")
