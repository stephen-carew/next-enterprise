"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Order, Table } from "../../lib/types";

interface TableWithOrders extends Table {
    orders: Order[];
    totalOwed: number;
}

export default function TablesPage() {
    const [tables, setTables] = useState<TableWithOrders[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const response = await fetch("/api/tables");
            if (!response.ok) throw new Error("Failed to fetch tables");
            const data = await response.json() as TableWithOrders[];
            setTables(data);
        } catch (error) {
            console.error("Error fetching tables:", error);
            toast.error("Failed to load tables");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentRequest = async (tableId: string) => {
        try {
            const response = await fetch(`/api/tables/${tableId}/payment-request`, {
                method: "POST",
            });

            if (!response.ok) throw new Error("Failed to request payment");

            toast.success("Payment request sent to bartender");
            fetchTables(); // Refresh table data
        } catch (error) {
            console.error("Error requesting payment:", error);
            toast.error("Failed to request payment");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">Table Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.map((table) => (
                        <Card key={table.id} className="bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Table {table.number}</span>
                                    <span className="text-lg font-bold">
                                        ${table.totalOwed.toFixed(2)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {table.orders.map((order) => (
                                        <div key={order.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    Order #{order.id.slice(0, 8)}
                                                </span>
                                                <span className="font-medium">
                                                    ${order.total.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {order.OrderDrink.map((item) => (
                                                    <div key={item.id}>
                                                        {item.quantity}x {item.Drink.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {table.orders.length > 0 && (
                                        <Button
                                            className="w-full"
                                            onClick={() => handlePaymentRequest(table.id)}
                                        >
                                            Request Payment
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
} 