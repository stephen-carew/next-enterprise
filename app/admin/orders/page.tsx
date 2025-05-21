"use client"

import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Order } from "@/lib/types"

interface OrderWithTable extends Order {
    tableNumber: number
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<OrderWithTable[]>([])
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED">("ALL")

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const response = await fetch("/api/orders")
            if (!response.ok) {
                throw new Error("Failed to fetch orders")
            }
            const data = await response.json() as Order[]
            const transformedData = data.map((order) => ({
                ...order,
                tableNumber: order.table.number
            }))
            setOrders(transformedData)
        } catch (error) {
            console.error("Error fetching orders:", error)
            toast.error("Failed to load orders")
        }
    }

    const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!response.ok) {
                throw new Error("Failed to update order status")
            }

            toast.success("Order status updated successfully")
            fetchOrders()
        } catch (error) {
            console.error("Error updating order status:", error)
            toast.error("Failed to update order status")
        }
    }

    const getStatusColor = (status: Order["status"]) => {
        switch (status) {
            case "PENDING":
                return "bg-orange-500"
            case "PREPARING":
                return "bg-blue-500"
            case "COMPLETED":
                return "bg-green-500"
            case "CANCELLED":
                return "bg-red-500"
            default:
                return "bg-gray-500"
        }
    }

    const filteredOrders = orders.filter(order =>
        filter === "ALL" || order.status === filter
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Orders Management</h2>
                <Select
                    value={filter}
                    onValueChange={(value) => setFilter(value as typeof filter)}
                >
                    <SelectTrigger ref={undefined} className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Orders</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PREPARING">Preparing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map((order) => (
                    <Card key={order.id}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Table {order.tableNumber}</CardTitle>
                                <Badge className={getStatusColor(order.status)}>
                                    {order.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Order Items:</p>
                                    <ul className="text-sm text-muted-foreground">
                                        {order.OrderDrink?.map((item, index) => (
                                            <li key={index}>
                                                {item.quantity}x {item.Drink.name}
                                            </li>
                                        )) || <li>No items in this order</li>}
                                    </ul>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-lg font-bold">
                                        ${order.total.toFixed(2)}
                                    </p>
                                    <Select
                                        value={order.status}
                                        onValueChange={(value) => handleStatusChange(order.id, value as Order["status"])}
                                    >
                                        <SelectTrigger ref={undefined} className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="PREPARING">Preparing</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(order.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
} 