'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Order, Table } from '@/types/table';

interface TableWithOrders extends Table {
    orders: Order[];
    hasActiveOrders: boolean;
    activeOrders: Order[];
}

interface TableResponse {
    table: TableWithOrders;
    hasActiveOrders: boolean;
    activeOrders: Order[];
}

interface SSEUpdate {
    type?: "connected";
    orderId?: string;
    status?: Order["status"];
    order?: Order;
}

export default function TableDashboardPage({ params }: { params: Promise<{ tableId: string }> }) {
    const [tableData, setTableData] = useState<TableResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const loadTable = async () => {
            const { tableId } = await params;
            await fetchTable(tableId);
        };
        loadTable();

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

                // Handle status updates
                if (data.orderId && data.status && tableData) {
                    console.log("Status update received:", { orderId: data.orderId, status: data.status });
                    setTableData(prevData => {
                        if (!prevData) return prevData;

                        const updatedActiveOrders = prevData.activeOrders.map(order =>
                            order.id === data.orderId
                                ? { ...order, status: data.status! }
                                : order
                        );

                        return {
                            ...prevData,
                            activeOrders: updatedActiveOrders,
                            hasActiveOrders: updatedActiveOrders.length > 0
                        };
                    });
                }

                // Handle full order updates
                if (data.order && data.status && tableData) {
                    console.log("Full order update received:", data.order);
                    setTableData(prevData => {
                        if (!prevData) return prevData;

                        const updatedActiveOrders = prevData.activeOrders.map(order =>
                            order.id === data.order!.id
                                ? data.order!
                                : order
                        );

                        return {
                            ...prevData,
                            activeOrders: updatedActiveOrders,
                            hasActiveOrders: updatedActiveOrders.length > 0
                        };
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
    }, [params]);

    const fetchTable = async (tableId: string) => {
        try {
            const response = await fetch(`/api/tables/lookup?id=${tableId}`);
            if (!response.ok) throw new Error('Failed to fetch table');
            const data = await response.json() as TableResponse;
            setTableData(data);
        } catch (error) {
            console.error('Error fetching table:', error);
            toast({
                title: 'Error',
                description: 'Failed to load table data',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewOrder = async () => {
        const { tableId } = await params;
        router.push(`/tables/${tableId}/order`);
    };

    const handleEditOrder = (orderId: string) => {
        router.push(`/order-status/${orderId}`);
    };

    const handleCancelOrder = async (orderId: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'CANCELLED',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to cancel order');
            }

            toast({
                title: 'Success',
                description: 'Order cancelled successfully',
            });

            // Refresh table data
            const { tableId } = await params;
            await fetchTable(tableId);
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast({
                title: 'Error',
                description: 'Failed to cancel order',
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-primary"></div>
            </div>
        );
    }

    if (!tableData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Table Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The requested table could not be found.
                        </p>
                        <Button onClick={() => router.push('/')} className="w-full">
                            Return Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                            Table {tableData.table.number}
                        </h1>
                        <Button onClick={handleNewOrder}>New Order</Button>
                    </div>

                    {tableData.hasActiveOrders ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                Active Orders
                            </h2>
                            {tableData.activeOrders.map((order) => (
                                <Card key={order.id} className="bg-white dark:bg-gray-800">
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="flex items-center gap-4">
                                                <span>Order #{order.id.slice(0, 8)}</span>
                                                <span className="text-sm font-normal px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                                    {order.status}
                                                </span>
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditOrder(order.id)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleCancelOrder(order.id)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {order.OrderDrink?.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {item.quantity}x {item.Drink?.name}
                                                        {item.notes && (
                                                            <span className="ml-2 text-gray-500">
                                                                ({item.notes})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-medium">
                                                        ${(item.Drink?.price || 0 * item.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                                <span className="font-semibold">Total</span>
                                                <span className="text-lg font-bold">
                                                    ${order.total.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle>No Active Orders</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    There are no active orders for this table.
                                </p>
                                <Button onClick={handleNewOrder} className="w-full">
                                    Place New Order
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
} 