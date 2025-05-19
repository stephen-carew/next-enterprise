import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useOrderStore } from "../lib/store";
import { Order } from "../lib/types";

export function OrderSummary() {
    const { items, tableNumber, clearOrder } = useOrderStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
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

            // Then create the order
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tableId,
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

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 sticky top-4">
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.drinkId} className="flex justify-between text-gray-700 dark:text-gray-300">
                            <span>
                                {item.quantity}x {item.drink.name}
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
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
                        {isSubmitting ? "Submitting..." : "Submit Order"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 