"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
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

interface DrinksResponse {
    drinks: Drink[];
}

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
    const [orderId, setOrderId] = useState<string>("");
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [editOrder, setEditOrder] = useState<{ [drinkId: string]: number }>({});
    const router = useRouter();
    const { toast } = useToast();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const { orderId } = await params;
            setOrderId(orderId);
            await Promise.all([
                fetchOrder(orderId),
                fetchDrinks(),
            ]);
        };
        loadData();
    }, [params]);

    useEffect(() => {
        if (!orderId) return;

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

    const fetchOrder = async (orderId: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) throw new Error('Failed to fetch order');
            const data = await response.json();
            setOrder(data as Order);
        } catch (error) {
            console.error('Error fetching order:', error);
            toast({
                title: 'Error',
                description: 'Failed to load order data',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDrinks = async () => {
        try {
            const response = await fetch('/api/drinks');
            if (!response.ok) throw new Error('Failed to fetch drinks');
            const data = await response.json() as DrinksResponse;
            if (!data.drinks || !Array.isArray(data.drinks)) {
                console.error('Drinks data is not in expected format:', data);
                setDrinks([]);
                return;
            }
            setDrinks(data.drinks);
        } catch (error) {
            console.error('Error fetching drinks:', error);
            toast({
                title: 'Error',
                description: 'Failed to load drinks',
                variant: 'destructive',
            });
            setDrinks([]);
        }
    };

    const handleUpdateOrder = async () => {
        if (!order) return;

        try {
            const items = Object.entries(editOrder)
                .filter(([_, quantity]) => quantity > 0)
                .map(([drinkId, quantity]) => {
                    const drink = drinks.find(d => d.id === drinkId);
                    return {
                        drinkId,
                        quantity,
                        price: drink?.price || 0,
                    };
                });

            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items,
                }),
            });

            if (!response.ok) throw new Error('Failed to update order');

            toast({
                title: 'Success',
                description: 'Order updated successfully',
            });

            setEditOpen(false);
            await fetchOrder(order.id);
        } catch (error) {
            console.error('Error updating order:', error);
            toast({
                title: 'Error',
                description: 'Failed to update order',
                variant: 'destructive',
            });
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;

        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'CANCELLED',
                }),
            });

            if (!response.ok) throw new Error('Failed to cancel order');

            toast({
                title: 'Success',
                description: 'Order cancelled successfully',
            });

            router.push(`/tables/${order.tableId}`);
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast({
                title: 'Error',
                description: 'Failed to cancel order',
                variant: 'destructive',
            });
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
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-900 border-t-transparent"></div>
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
                                onClick={() => router.push(`/tables/${order.tableId}`)}
                            >
                                Back to Table
                            </Button>
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
                                onClick={handleCancelOrder}
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
                                        <div className="flex flex-col">
                                            <span>{drink.name}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">${drink.price.toFixed(2)}</span>
                                        </div>
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
                                <Button onClick={handleUpdateOrder}>Save Changes</Button>
                            </div>
                        </RadixDialog.Content>
                    </RadixDialog.Portal>
                </RadixDialog.Root>
            </div>
        </div>
    );
} 