"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Apple, Banknote, CreditCard, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

interface PaymentMethodsProps {
    total: number
    onPaymentComplete: (paymentId: string, paymentStatus: "PAID" | "FAILED", paymentMethod: "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH", paymentDetails?: { last4?: string; cardType?: string; expiryDate?: string }) => void
    onCancel: () => void
}

export function PaymentMethods({ total, onPaymentComplete, onCancel }: PaymentMethodsProps) {
    const [paymentMethod, setPaymentMethod] = useState<"CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH">("CARD")
    const [cardNumber, setCardNumber] = useState("")
    const [expiryDate, setExpiryDate] = useState("")
    const [cvv, setCvv] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [isCardValid, setIsCardValid] = useState(true)
    const [isExpiryValid, setIsExpiryValid] = useState(true)
    const [isCvvValid, setIsCvvValid] = useState(true)

    const validateCardNumber = (number: string) => {
        // Basic Luhn algorithm validation
        const digits = number.replace(/\D/g, "").split("").map(Number)
        const lastDigit = digits.pop()!
        const sum = digits
            .reverse()
            .map((digit, index) => (index % 2 === 0 ? digit * 2 : digit))
            .map(digit => (digit > 9 ? digit - 9 : digit))
            .reduce((acc, digit) => acc + digit, 0)
        return (sum + lastDigit) % 10 === 0
    }

    const validateExpiryDate = (date: string) => {
        const [month, year] = date.split("/").map(Number)
        const now = new Date()
        const currentYear = now.getFullYear() % 100
        const currentMonth = now.getMonth() + 1

        if (!month || !year) return false
        if (month < 1 || month > 12) return false
        if (year < currentYear || (year === currentYear && month < currentMonth)) return false
        return true
    }

    const validateCvv = (cvv: string) => {
        return /^\d{3,4}$/.test(cvv)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (paymentMethod === "CASH") {
            // For cash payments, we'll just mark it as pending
            // The bartender will need to confirm it in the dashboard
            const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            onPaymentComplete(paymentId, "PAID", "CASH")
            return
        }

        // Validate all fields for card payment
        const isCardNumberValid = validateCardNumber(cardNumber)
        const isExpiryDateValid = validateExpiryDate(expiryDate)
        const isCvvNumberValid = validateCvv(cvv)

        setIsCardValid(isCardNumberValid)
        setIsExpiryValid(isExpiryDateValid)
        setIsCvvValid(isCvvNumberValid)

        if (!isCardNumberValid || !isExpiryDateValid || !isCvvNumberValid) {
            toast.error("Please check your card details")
            return
        }

        setIsProcessing(true)

        try {
            // Here you would integrate with your payment processor
            // For now, we'll simulate a successful payment with a mock payment ID
            await new Promise(resolve => setTimeout(resolve, 1500))

            // Generate a mock payment ID (in production, this would come from your payment processor)
            const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // Simulate successful payment
            const paymentStatus: "PAID" | "FAILED" = "PAID"

            // Prepare payment details based on the selected method
            const paymentDetails = paymentMethod === "CARD" ? {
                last4: cardNumber.slice(-4),
                cardType: "Visa", // In production, this would be determined by the card number
                expiryDate: expiryDate
            } : undefined

            toast.success("Payment successful!")
            onPaymentComplete(paymentId, paymentStatus, paymentMethod, paymentDetails)
        } catch (error) {
            console.error("Payment failed:", error)
            toast.error("Payment failed. Please try again.")
            onPaymentComplete("", "FAILED", paymentMethod)
        } finally {
            setIsProcessing(false)
        }
    }

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
        const matches = v.match(/\d{4,16}/g)
        const match = (matches && matches[0]) || ""
        const parts = []

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4))
        }

        if (parts.length) {
            return parts.join(" ")
        } else {
            return value
        }
    }

    const formatExpiryDate = (value: string) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
        if (v.length >= 3) {
            return `${v.substring(0, 2)}/${v.substring(2, 4)}`
        }
        return v
    }

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Payment Details</CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                    Select your preferred payment method
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <RadioGroup
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH")}
                            className="grid grid-cols-2 gap-4"
                        >
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative"
                            >
                                <RadioGroupItem
                                    value="CARD"
                                    id="card"
                                    className="peer sr-only"
                                />
                                <Label
                                    htmlFor="card"
                                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors"
                                >
                                    <CreditCard className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">Card</span>
                                </Label>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative"
                            >
                                <RadioGroupItem
                                    value="CASH"
                                    id="cash"
                                    className="peer sr-only"
                                />
                                <Label
                                    htmlFor="cash"
                                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors"
                                >
                                    <Banknote className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">Cash</span>
                                </Label>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative"
                            >
                                <RadioGroupItem
                                    value="APPLE_PAY"
                                    id="apple"
                                    className="peer sr-only"
                                />
                                <Label
                                    htmlFor="apple"
                                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors"
                                >
                                    <Apple className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">Apple Pay</span>
                                </Label>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative"
                            >
                                <RadioGroupItem
                                    value="GOOGLE_PAY"
                                    id="google"
                                    className="peer sr-only"
                                />
                                <Label
                                    htmlFor="google"
                                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors"
                                >
                                    <Wallet className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">Google Pay</span>
                                </Label>
                            </motion.div>
                        </RadioGroup>
                    </div>

                    <AnimatePresence mode="wait">
                        {paymentMethod === "CARD" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="cardNumber" className="text-sm font-medium">Card Number</Label>
                                    <Input
                                        id="cardNumber"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardNumber}
                                        onChange={(e) => {
                                            const formatted = formatCardNumber(e.target.value)
                                            setCardNumber(formatted)
                                            setIsCardValid(validateCardNumber(formatted))
                                        }}
                                        maxLength={19}
                                        required
                                        className={`h-10 ${!isCardValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    />
                                    {!isCardValid && (
                                        <p className="text-sm text-red-500 mt-1">Please enter a valid card number</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiryDate" className="text-sm font-medium">Expiry Date</Label>
                                        <Input
                                            id="expiryDate"
                                            placeholder="MM/YY"
                                            value={expiryDate}
                                            onChange={(e) => {
                                                const formatted = formatExpiryDate(e.target.value)
                                                setExpiryDate(formatted)
                                                setIsExpiryValid(validateExpiryDate(formatted))
                                            }}
                                            maxLength={5}
                                            required
                                            className={`h-10 ${!isExpiryValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                        />
                                        {!isExpiryValid && (
                                            <p className="text-sm text-red-500 mt-1">Please enter a valid expiry date</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cvv" className="text-sm font-medium">CVV</Label>
                                        <Input
                                            id="cvv"
                                            placeholder="123"
                                            value={cvv}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "")
                                                setCvv(value)
                                                setIsCvvValid(validateCvv(value))
                                            }}
                                            maxLength={4}
                                            required
                                            className={`h-10 ${!isCvvValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                        />
                                        {!isCvvValid && (
                                            <p className="text-sm text-red-500 mt-1">Please enter a valid CVV</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {paymentMethod === "CASH" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="text-center p-6 bg-muted/50 rounded-lg border border-muted">
                                    <Banknote className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Please proceed to the counter to complete your payment. The bartender will confirm your payment.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                            <span className="text-lg font-medium">Total Amount</span>
                            <span className="text-2xl font-bold">${total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-11"
                                onClick={onCancel}
                                disabled={isProcessing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-11"
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                                    />
                                ) : (
                                    paymentMethod === "CASH" ? "Pay at Counter" : "Pay Now"
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
} 