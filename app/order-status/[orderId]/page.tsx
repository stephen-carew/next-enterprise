"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Drink, Order } from "../../../lib/types";

interface SSEUpdate {
    type?: "connected";
    orderId?: string;
    status?: Order["status"];
    order?: Order;
}

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
    const [orderId, setOrderId] = useState<string>("");
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [editOrder, setEditOrder] = useState<{ [drinkId: string]: number }>({});
    const router = useRouter();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Get orderId from params
        params.then(({ orderId }) => {
            setOrderId(orderId);
        });
    }, [params]);

    useEffect(() => {
        if (!orderId) return;

        // Fetch initial order
        fetchOrder();

        // Set up SSE connection
        eventSourceRef.current = new EventSource('/api/orders/events');

        eventSourceRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SSEUpdate;
                console.log("Received SSE update:", data);

                if (data.type === "connected") {
                    console.log("SSE connected");
                    return;
                }

                // Handle status updates for this order
                if (data.orderId === orderId) {
                    if (data.order) {
                        console.log("Full order update received:", data.order);
                        setOrder(data.order);
                    } else if (data.status && order) {
                        console.log("Status update received:", { orderId, status: data.status });
                        setOrder(prevOrder => {
                            if (!prevOrder) return null;
                            return { ...prevOrder, status: data.status! };
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing SSE message:", error);
            }
        };

        eventSourceRef.current.onerror = (error) => {
            console.error('SSE Error:', error);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                // Attempt to reconnect after a delay
                setTimeout(() => {
                    console.log("Attempting to reconnect SSE...");
                    eventSourceRef.current = new EventSource('/api/orders/events');
                }, 5000);
            }
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [orderId, order]);

    // Fetch drinks for modal
    useEffect(() => {
        if (editOpen) {
            fetch("/api/drinks")
                .then(res => res.json() as Promise<Drink[]>)
                .then((data) => setDrinks(data));
        }
    }, [editOpen]);

    // Initialize editOrder state when opening modal
    useEffect(() => {
        if (editOpen && order) {
            const initial: { [drinkId: string]: number } = {};
            order.OrderDrink.forEach(item => {
                initial[item.drinkId] = item.quantity;
            });
            setEditOrder(initial);
        }
    }, [editOpen, order]);

    const fetchOrder = async () => {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch order");
            }
            const data = await response.json();
            setOrder(data as Order);
        } catch (error) {
            console.error("Failed to fetch order:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "bg-yellow-500/20 text-yellow-500";
            case "PREPARING":
                return "bg-blue-500/20 text-blue-500";
            case "COMPLETED":
                return "bg-green-500/20 text-green-500";
            case "CANCELLED":
                return "bg-red-500/20 text-red-500";
            default:
                return "bg-gray-500/20 text-gray-500";
        }
    };

    const handleNewOrder = () => {
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="max-w-2xl w-full px-4 py-8 mx-auto">
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-fuchsia-500 border-t-transparent"></div>
                        <p className="mt-6 text-lg text-muted-foreground">Loading order status...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="max-w-2xl w-full px-4 py-8 mx-auto">
                    <div className="text-center">Order not found</div>
                </div>
            </div>
        );
    }

    const isOrderCompleted = order.status === "COMPLETED" || order.status === "CANCELLED";

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="max-w-2xl w-full px-4 py-8 mx-auto">
                <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">Order Status</h1>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-gray-900 dark:text-gray-100">Table {order.table.number}</CardTitle>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
                            >
                                {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {order.OrderDrink.map((item) => (
                                <div key={item.id} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {item.quantity}x {item.Drink.name}
                                        {item.notes && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {" "}
                                                - {item.notes}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="flex justify-between font-medium text-gray-900 dark:text-gray-100">
                                    <span>Total</span>
                                    <span>${order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex gap-4 justify-end mt-6">
                    {isOrderCompleted ? (
                        <Button onClick={handleNewOrder} className="w-full md:w-auto">
                            Create New Order
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setEditOpen(true)}
                                disabled={isOrderCompleted}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={isOrderCompleted}
                            >
                                Cancel Order
                            </Button>
                        </>
                    )}
                </div>
                <RadixDialog.Root open={editOpen} onOpenChange={setEditOpen}>
                    <RadixDialog.Portal>
                        <RadixDialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                        <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg focus:outline-none">
                            <RadixDialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Edit Order</RadixDialog.Title>
                            <div className="py-4 text-gray-700 dark:text-gray-300 space-y-4 max-h-[60vh] overflow-y-auto">
                                {drinks.map(drink => (
                                    <div key={drink.id} className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 py-2">
                                        <span>{drink.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setEditOrder(o => ({ ...o, [drink.id]: Math.max((o[drink.id] || 0) - 1, 0) }))}>-</Button>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={editOrder[drink.id] || 0}
                                                onChange={e => setEditOrder(o => ({ ...o, [drink.id]: Math.max(Number(e.target.value), 0) }))}
                                                className="w-16 text-center"
                                            />
                                            <Button size="sm" variant="outline" onClick={() => setEditOrder(o => ({ ...o, [drink.id]: (o[drink.id] || 0) + 1 }))}>+</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <RadixDialog.Close asChild>
                                    <Button variant="outline">Cancel</Button>
                                </RadixDialog.Close>
                                <Button onClick={() => {/* TODO: Save logic */ }}>Save Changes</Button>
                            </div>
                        </RadixDialog.Content>
                    </RadixDialog.Portal>
                </RadixDialog.Root>
            </div>
        </div>
    );
} 