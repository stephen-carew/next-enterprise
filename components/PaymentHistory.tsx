"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Order } from "@/lib/types"

interface PaymentHistoryProps {
    order: Order
    onRefund?: (orderId: string) => Promise<void>
}

interface PaymentHistoryEntry {
    status: Order["paymentStatus"]
    timestamp: string
    description: string
}

export function PaymentHistory({ order, onRefund }: PaymentHistoryProps) {
    const [isRefunding, setIsRefunding] = useState(false)
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === "ADMIN"

    // In a real application, this would come from the database
    const paymentHistory: PaymentHistoryEntry[] = [
        {
            status: "PENDING",
            timestamp: order.createdAt,
            description: "Order created"
        },
        {
            status: order.paymentStatus || "PENDING",
            timestamp: order.updatedAt,
            description: `Payment ${(order.paymentStatus || "PENDING").toLowerCase()}`
        }
    ]

    const getStatusVariant = (status: Order["paymentStatus"]) => {
        switch (status) {
            case "PAID":
                return "success"
            case "PENDING":
                return "default"
            case "FAILED":
                return "destructive"
            case "REFUNDED":
                return "secondary"
            default:
                return "default"
        }
    }

    const handleRefund = async () => {
        if (!onRefund || !isAdmin) return

        try {
            setIsRefunding(true)
            await onRefund(order.id)
            toast.success("Refund processed successfully")
        } catch (error) {
            console.error("Refund failed:", error)
            toast.error("Failed to process refund")
        } finally {
            setIsRefunding(false)
        }
    }

    const getPaymentMethodIcon = (method: Order["paymentMethod"]) => {
        switch (method) {
            case "CARD":
                return "💳"
            case "APPLE_PAY":
                return "🍎"
            case "GOOGLE_PAY":
                return "G"
            case "CASH":
                return "💵"
            default:
                return "💳"
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Payment Method Details */}
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{getPaymentMethodIcon(order.paymentMethod)}</span>
                            <div>
                                <p className="text-sm font-medium">
                                    {order.paymentMethod === "CARD" && order.paymentDetails?.cardType
                                        ? `${order.paymentDetails.cardType} ending in ${order.paymentDetails.last4}`
                                        : order.paymentMethod === "CASH"
                                            ? "Cash Payment"
                                            : order.paymentMethod ? order.paymentMethod.replace("_", " ") : "Unknown Payment Method"}
                                </p>
                                {order.paymentMethod === "CARD" && order.paymentDetails?.expiryDate && (
                                    <p className="text-xs text-muted-foreground">
                                        Expires {order.paymentDetails.expiryDate}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge variant={getStatusVariant(order.paymentStatus || "PENDING")}>
                            {order.paymentStatus || "PENDING"}
                        </Badge>
                    </div>

                    {/* Payment History */}
                    <div className="space-y-2">
                        {paymentHistory.map((entry, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                                <div>
                                    <p className="text-sm font-medium">{entry.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <Badge variant={getStatusVariant(entry.status)}>
                                    {entry.status}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Refund Button - Only visible to admins */}
                    {isAdmin && order.paymentStatus === "PAID" && onRefund && (
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleRefund}
                            disabled={isRefunding}
                        >
                            {isRefunding ? "Processing Refund..." : "Request Refund"}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
} 