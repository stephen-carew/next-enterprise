"use client"
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { PaymentHistory } from "@/components/PaymentHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order, OrderDrink } from "@/lib/types";

interface OrderWithTable extends Order {
    tableNumber: number;
}

interface SSEUpdate {
    type?: "connected" | "new-order" | "status-update" | "payment-update";
    orderId?: string;
    status?: Order["status"];
    paymentStatus?: Order["paymentStatus"];
    order?: Order;
}

export default function BartenderPage() {
    const [orders, setOrders] = useState<OrderWithTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<Order["paymentStatus"] | "ALL">("ALL");
    const [userRole, setUserRole] = useState<string>("");
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Fetch user role
        const fetchUserRole = async () => {
            try {
                const response = await fetch("/api/auth/check-admin");
                if (response.ok) {
                    setUserRole("ADMIN");
                } else {
                    setUserRole("BARTENDER");
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                setUserRole("BARTENDER");
            }
        };

        fetchUserRole();
        fetchOrders();

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

                // Handle new order
                if (data.type === "new-order" && data.order) {
                    console.log("New order received:", data.order);
                    setOrders(prevOrders => {
                        const orderWithTable: OrderWithTable = {
                            ...data.order!,
                            tableNumber: data.order!.table.number
                        };
                        return [orderWithTable, ...prevOrders];
                    });
                    return;
                }

                // Handle payment status updates
                if (data.type === "payment-update" && data.orderId && data.paymentStatus) {
                    console.log("Payment status update:", { orderId: data.orderId, paymentStatus: data.paymentStatus });
                    setOrders(prevOrders => {
                        const orderIndex = prevOrders.findIndex(order => order.id === data.orderId);
                        if (orderIndex === -1) return prevOrders;

                        const updatedOrders = [...prevOrders];
                        const existingOrder = updatedOrders[orderIndex];
                        if (!existingOrder) return prevOrders;

                        updatedOrders[orderIndex] = {
                            ...existingOrder,
                            paymentStatus: data.paymentStatus!
                        };
                        return updatedOrders;
                    });
                    return;
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
                if (data.order) {
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

    const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Failed to update order status");
            }

            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId
                        ? { ...order, status: newStatus }
                        : order
                )
            );

            toast.success(`Order status updated to ${newStatus.toLowerCase()}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error("Failed to update order status");
        }
    };

    const handleRefund = async (orderId: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/refund`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to process refund");
            }

            // Update the order's payment status
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId
                        ? { ...order, paymentStatus: "REFUNDED" }
                        : order
                )
            );

            toast.success("Refund processed successfully");
        } catch (error) {
            console.error("Error processing refund:", error);
            toast.error("Failed to process refund");
            throw error; // Re-throw to be handled by the PaymentHistory component
        }
    };

    const handleCashPaymentConfirmation = async (orderId: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/confirm-cash-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to confirm cash payment");
            }

            // Update the order's payment status
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId
                        ? { ...order, paymentStatus: "PAID" }
                        : order
                )
            );

            toast.success("Cash payment confirmed");
        } catch (error) {
            console.error("Error confirming cash payment:", error);
            toast.error("Failed to confirm cash payment");
        }
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/login" })
    }

    const getStatusVariant = (status: Order["status"]) => {
        switch (status) {
            case "PENDING":
                return "default";
            case "PREPARING":
                return "destructive";
            case "COMPLETED":
                return "success";
            case "CANCELLED":
                return "destructive";
            default:
                return "default";
        }
    };

    const getPaymentStatusVariant = (status: Order["paymentStatus"]) => {
        switch (status) {
            case "PAID":
                return "success";
            case "PENDING":
                return "default";
            case "FAILED":
                return "destructive";
            case "REFUNDED":
                return "secondary";
            default:
                return "default";
        }
    };

    const filteredOrders = orders.filter(order =>
        paymentStatusFilter === "ALL" ||
        (paymentStatusFilter === "PENDING" && (!order.paymentStatus || order.paymentStatus === "PENDING")) ||
        order.paymentStatus === paymentStatusFilter
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            {userRole === "ADMIN" && (
                                <Link href="/admin">
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Switch to Admin Dashboard
                                    </Button>
                                </Link>
                            )}
                        </div>
                        <Button variant="outline" onClick={handleSignOut}>
                            Sign Out
                        </Button>
                    </div>
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

                    {/* Pending Cash Payments Section */}
                    {orders.some(order => order.paymentMethod === "CASH" && order.paymentStatus === "PENDING") && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                                Pending Cash Payments
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {orders
                                    .filter(order => order.paymentMethod === "CASH" && order.paymentStatus === "PENDING")
                                    .map((order) => (
                                        <Card key={order.id} className="bg-white dark:bg-gray-800">
                                            <CardHeader>
                                                <CardTitle className="flex justify-between items-center">
                                                    <span>Table {order.tableNumber}</span>
                                                    <span className="text-lg font-bold">
                                                        ${order.total.toFixed(2)}
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="text-sm text-muted-foreground">
                                                        Payment ID: {order.paymentId}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="flex-1"
                                                            onClick={() => handleCashPaymentConfirmation(order.id)}
                                                        >
                                                            Confirm Cash Payment
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Status Filter */}
                    <div className="mb-6 flex gap-2">
                        <Button
                            variant={paymentStatusFilter === "ALL" ? "default" : "outline"}
                            onClick={() => setPaymentStatusFilter("ALL")}
                        >
                            All
                        </Button>
                        <Button
                            variant={paymentStatusFilter === "PAID" ? "default" : "outline"}
                            onClick={() => setPaymentStatusFilter("PAID")}
                        >
                            Paid
                        </Button>
                        <Button
                            variant={paymentStatusFilter === "PENDING" ? "default" : "outline"}
                            onClick={() => setPaymentStatusFilter("PENDING")}
                        >
                            Pending
                        </Button>
                        <Button
                            variant={paymentStatusFilter === "FAILED" ? "default" : "outline"}
                            onClick={() => setPaymentStatusFilter("FAILED")}
                        >
                            Failed
                        </Button>
                        <Button
                            variant={paymentStatusFilter === "REFUNDED" ? "default" : "outline"}
                            onClick={() => setPaymentStatusFilter("REFUNDED")}
                        >
                            Refunded
                        </Button>
                    </div>

                    {/* Existing Orders Section */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-primary"></div>
                            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">Loading orders...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-16">
                            <Card className="max-w-md mx-auto bg-white dark:bg-gray-800">
                                <CardContent className="pt-6">
                                    <p className="text-lg text-gray-600 dark:text-gray-400">No orders yet</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredOrders.map((order) => (
                                <Card key={order.id} className="mb-4">
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle>Table {order.table.number}</CardTitle>
                                            <Badge variant={getStatusVariant(order.status)}>
                                                {order.status}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-sm text-muted-foreground">
                                                Payment ID: {order.paymentId}
                                            </div>
                                            <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                                                {order.paymentStatus}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                {order.OrderDrink.map((item: OrderDrink) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                                                    >
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {item.Drink.name}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            x{item.quantity}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <PaymentHistory order={order} onRefund={handleRefund} />
                                            <div className="flex flex-col gap-2">
                                                {order.status === "PENDING" && (
                                                    <Button
                                                        onClick={() => handleStatusChange(order.id, "PREPARING")}
                                                        className="w-full"
                                                    >
                                                        Start Preparing
                                                    </Button>
                                                )}
                                                {order.status === "PREPARING" && (
                                                    <Button
                                                        onClick={() => handleStatusChange(order.id, "READY")}
                                                        className="w-full"
                                                    >
                                                        Mark as Ready
                                                    </Button>
                                                )}
                                                {order.status === "READY" && (
                                                    <Button
                                                        onClick={() => handleStatusChange(order.id, "COMPLETED")}
                                                        className="w-full"
                                                    >
                                                        Complete Order
                                                    </Button>
                                                )}
                                                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleStatusChange(order.id, "CANCELLED")}
                                                        className="w-full"
                                                    >
                                                        Cancel Order
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 