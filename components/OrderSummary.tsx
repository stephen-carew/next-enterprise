import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { PaymentMethods } from "@/components/PaymentMethods";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useOrderStore } from "../lib/store";
import { Order } from "../lib/types";

export function OrderSummary() {
    const { items, tableNumber, clearOrder } = useOrderStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const router = useRouter();

    const total = items.reduce((sum: number, item) => sum + item.price * item.quantity, 0);

    const handleSubmitOrder = async () => {
        if (!tableNumber) {
            toast.error("Please enter a table number");
            return;
        }

        if (items.length === 0) {
            toast.error("Please add items to your order");
            return;
        }

        setShowPayment(true);
    };

    const handlePaymentComplete = async (paymentId: string, paymentStatus: "PAID" | "FAILED") => {
        if (paymentStatus === "FAILED") {
            toast.error("Payment failed. Please try again.");
            setShowPayment(false);
            return;
        }

        setIsSubmitting(true);
        try {
            // First, get or create the table
            const tableResponse = await fetch("/api/tables", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ number: tableNumber }),
            });

            if (!tableResponse.ok) {
                throw new Error("Failed to get/create table");
            }

            const table = await tableResponse.json() as { id: string };
            const tableId = table.id;

            // Check for existing active orders for this table
            const existingOrdersResponse = await fetch("/api/orders");
            if (!existingOrdersResponse.ok) {
                throw new Error("Failed to fetch existing orders");
            }

            const existingOrders = await existingOrdersResponse.json() as Order[];
            const activeOrder = existingOrders.find(
                order =>
                    order.tableId === tableId &&
                    order.status !== "COMPLETED" &&
                    order.status !== "CANCELLED"
            );

            if (activeOrder) {
                // If there's an active order, redirect to it
                toast.success("Found existing order for this table");
                router.push(`/order-status/${activeOrder.id}`);
                return;
            }

            // If no active order exists, create a new one
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tableId,
                    paymentId,
                    paymentStatus,
                    items: items.map((item) => ({
                        drinkId: item.drinkId,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit order");
            }

            const order = await response.json() as Order;
            toast.success("Order submitted successfully!");
            clearOrder();
            router.push(`/order-status/${order.id}`);
        } catch (error) {
            console.error("Failed to submit order:", error);
            toast.error("Failed to submit order. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) {
        return null;
    }

    if (showPayment) {
        return (
            <PaymentMethods
                total={total}
                onPaymentComplete={handlePaymentComplete}
                onCancel={() => setShowPayment(false)}
            />
        );
    }

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 md:sticky md:top-4 fixed bottom-0 left-0 right-0 z-50 md:z-0 md:rounded-lg rounded-t-lg shadow-lg md:shadow-none">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="max-h-[40vh] md:max-h-none overflow-y-auto">
                        {items.map((item) => (
                            <div key={item.drinkId} className="flex justify-between text-gray-700 dark:text-gray-300">
                                <span>
                                    {item.quantity}x {item.drink.name}
                                </span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "Proceed to Payment"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 