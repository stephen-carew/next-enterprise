"use client"
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Order, OrderDrink } from "../../lib/types";

interface OrderWithTable extends Order {
    tableNumber: number;
}

interface SSEUpdate {
    type?: "connected";
    orderId?: string;
    status?: Order["status"];
    order?: Order;
}

interface PaymentRequest {
    id: string;
    tableId: string;
    amount: number;
    status: "PENDING" | "CONFIRMED" | "REJECTED";
    createdAt: Date;
}

export default function BartenderPage() {
    const [orders, setOrders] = useState<OrderWithTable[]>([]);
    const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        fetchOrders();
        fetchPaymentRequests();

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

                // Handle payment request updates
                if (data.type === "payment-request") {
                    console.log("Payment request update:", data);
                    fetchPaymentRequests();
                }

                // Handle new order
                if (data.order && !data.status) {
                    console.log("New order received:", data.order);
                    setOrders(prevOrders => {
                        const orderWithTable: OrderWithTable = {
                            ...data.order!,
                            tableNumber: data.order!.table.number
                        };
                        return [orderWithTable, ...prevOrders];
                    });
                }

                // Handle status updates
                if (data.orderId && data.status) {
                    console.log("Status update received:", { orderId: data.orderId, status: data.status });
                    setOrders(prevOrders => {
                        const orderIndex = prevOrders.findIndex(order => order.id === data.orderId);
                        if (orderIndex === -1) return prevOrders;

                        const updatedOrders = [...prevOrders];
                        const existingOrder = updatedOrders[orderIndex];
                        if (!existingOrder) return prevOrders;

                        updatedOrders[orderIndex] = {
                            ...existingOrder,
                            status: data.status!
                        };
                        return updatedOrders;
                    });
                }

                // Handle full order updates
                if (data.order && data.status) {
                    console.log("Full order update received:", data.order);
                    setOrders(prevOrders => {
                        const orderIndex = prevOrders.findIndex(order => order.id === data.order!.id);
                        const orderWithTable: OrderWithTable = {
                            ...data.order!,
                            tableNumber: data.order!.table.number
                        };

                        if (orderIndex === -1) {
                            return [orderWithTable, ...prevOrders];
                        }
                        const updatedOrders = [...prevOrders];
                        updatedOrders[orderIndex] = orderWithTable;
                        return updatedOrders;
                    });
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
    }, []);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/orders");
            if (!response.ok) {
                throw new Error("Failed to fetch orders");
            }
            const data = await response.json() as Order[];
            // Transform the data to include tableNumber
            const transformedData = data.map((order) => ({
                ...order,
                tableNumber: order.table.number
            }));
            console.log("Fetched orders:", transformedData);
            setOrders(transformedData);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Failed to load orders");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPaymentRequests = async () => {
        try {
            const response = await fetch("/api/payment-requests");
            if (!response.ok) throw new Error("Failed to fetch payment requests");
            const data = await response.json() as PaymentRequest[];
            setPaymentRequests(data);
        } catch (error) {
            console.error("Error fetching payment requests:", error);
            toast.error("Failed to load payment requests");
        }
    };

    const updateOrderStatus = async (orderId: string, status: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED") => {
        try {
            console.log("Updating order status:", { orderId, status });

            // Optimistically update the UI
            setOrders(prevOrders => {
                const orderIndex = prevOrders.findIndex(order => order.id === orderId);
                if (orderIndex === -1) return prevOrders;

                const updatedOrders = [...prevOrders];
                const existingOrder = updatedOrders[orderIndex];
                if (!existingOrder) return prevOrders;

                updatedOrders[orderIndex] = {
                    ...existingOrder,
                    status
                };
                return updatedOrders;
            });

            const response = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            });

            const data = await response.json() as { error?: string } | Order;

            if (!response.ok) {
                // Revert the optimistic update if the request failed
                setOrders(prevOrders => {
                    const orderIndex = prevOrders.findIndex(order => order.id === orderId);
                    if (orderIndex === -1) return prevOrders;

                    const updatedOrders = [...prevOrders];
                    const existingOrder = updatedOrders[orderIndex];
                    if (!existingOrder) return prevOrders;

                    updatedOrders[orderIndex] = {
                        ...existingOrder,
                        status: existingOrder.status // Revert to previous status
                    };
                    return updatedOrders;
                });

                throw new Error('error' in data ? data.error : "Failed to update order status");
            }

            console.log("Order updated successfully:", data);
            toast.success(`Order marked as ${status.toLowerCase()}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error(error instanceof Error ? error.message : "Failed to update order status");
        }
    };

    const handlePaymentConfirmation = async (requestId: string, confirm: boolean) => {
        try {
            const response = await fetch(`/api/payment-requests/${requestId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: confirm ? "CONFIRMED" : "REJECTED" }),
            });

            if (!response.ok) throw new Error("Failed to update payment request");

            toast.success(confirm ? "Payment confirmed" : "Payment rejected");
            fetchPaymentRequests();
        } catch (error) {
            console.error("Error updating payment request:", error);
            toast.error("Failed to update payment request");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-8 md:mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                            Bartender Dashboard
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Manage orders and payments
                        </p>
                    </motion.div>

                    {/* Payment Requests Section */}
                    {paymentRequests.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                                Payment Requests
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paymentRequests.map((request) => (
                                    <Card key={request.id} className="bg-white dark:bg-gray-800">
                                        <CardHeader>
                                            <CardTitle className="flex justify-between items-center">
                                                <span>Table {request.tableId}</span>
                                                <span className="text-lg font-bold">
                                                    ${request.amount.toFixed(2)}
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex gap-2">
                                                <Button
                                                    className="flex-1"
                                                    onClick={() => handlePaymentConfirmation(request.id, true)}
                                                >
                                                    Confirm Payment
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="flex-1"
                                                    onClick={() => handlePaymentConfirmation(request.id, false)}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Existing Orders Section */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-primary"></div>
                            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">Loading orders...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-16">
                            <Card className="max-w-md mx-auto bg-white dark:bg-gray-800">
                                <CardContent className="pt-6">
                                    <p className="text-lg text-gray-600 dark:text-gray-400">No orders yet</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card className="bg-white dark:bg-gray-800">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <span className="text-gray-900 dark:text-gray-100">Table {order.tableNumber}</span>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.status === "PENDING"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                                    : order.status === "PREPARING"
                                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                        : order.status === "COMPLETED"
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                    }`}>
                                                    {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    {order.OrderDrink.map((item: OrderDrink) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                                                        >
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.Drink.name}</span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">x{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {order.status === "PENDING" && (
                                                        <Button
                                                            className="w-full"
                                                            onClick={() => updateOrderStatus(order.id, "PREPARING")}
                                                        >
                                                            Start Preparing
                                                        </Button>
                                                    )}
                                                    {order.status === "PREPARING" && (
                                                        <Button
                                                            className="w-full"
                                                            onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                                                        >
                                                            Mark as Completed
                                                        </Button>
                                                    )}
                                                    {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full"
                                                            onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                                                        >
                                                            Cancel Order
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 