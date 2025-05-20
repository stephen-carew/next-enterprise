"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Package, Plus, Trash2, Users, Wine } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { PaymentAnalytics } from "@/components/PaymentAnalytics"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Order } from "@/lib/types"

interface OrderWithTable extends Order {
    tableNumber: number
}

interface User {
    id: string
    email: string
    role: "BARTENDER" | "ADMIN"
    createdAt: Date
}

interface InventoryItem {
    id: string
    name: string
    description?: string
    quantity: number
    unit: string
    minQuantity: number
    category: string
    supplier?: string
    price: number
    createdAt: Date
    updatedAt: Date
}

interface InventoryAlert {
    id: string
    type: "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING"
    message: string
    isResolved: boolean
    createdAt: Date
    resolvedAt?: Date
}

export default function AdminPage() {
    const [orders, setOrders] = useState<OrderWithTable[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [alerts, setAlerts] = useState<InventoryAlert[]>([])
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
    const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false)
    const [newUser, setNewUser] = useState({ email: "", password: "" })
    const [newItem, setNewItem] = useState({
        name: "",
        description: "",
        quantity: 0,
        unit: "",
        minQuantity: 0,
        category: "",
        supplier: "",
        price: 0
    })

    useEffect(() => {
        fetchOrders()
        fetchUsers()
        fetchInventory()
        fetchAlerts()
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

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/users")
            if (!response.ok) {
                throw new Error("Failed to fetch users")
            }
            const data = await response.json() as User[]
            setUsers(data)
        } catch (error) {
            console.error("Error fetching users:", error)
            toast.error("Failed to load users")
        }
    }

    const fetchInventory = async () => {
        try {
            const response = await fetch("/api/inventory")
            if (!response.ok) {
                throw new Error("Failed to fetch inventory")
            }
            const data = await response.json() as InventoryItem[]
            setInventory(data)
        } catch (error) {
            console.error("Error fetching inventory:", error)
            toast.error("Failed to load inventory")
        }
    }

    const fetchAlerts = async () => {
        try {
            const response = await fetch("/api/inventory/alerts")
            if (!response.ok) {
                throw new Error("Failed to fetch alerts")
            }
            const data = await response.json() as InventoryAlert[]
            setAlerts(data)
        } catch (error) {
            console.error("Error fetching alerts:", error)
            toast.error("Failed to load alerts")
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...newUser,
                    role: "BARTENDER"
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to create user")
            }

            toast.success("User created successfully")
            setIsUserDialogOpen(false)
            setNewUser({ email: "", password: "" })
            fetchUsers()
        } catch (error) {
            console.error("Error creating user:", error)
            toast.error("Failed to create user")
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                throw new Error("Failed to delete user")
            }

            toast.success("User deleted successfully")
            fetchUsers()
        } catch (error) {
            console.error("Error deleting user:", error)
            toast.error("Failed to delete user")
        }
    }

    const handleCreateInventoryItem = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch("/api/inventory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newItem),
            })

            if (!response.ok) {
                throw new Error("Failed to create inventory item")
            }

            toast.success("Inventory item created successfully")
            setIsInventoryDialogOpen(false)
            setNewItem({
                name: "",
                description: "",
                quantity: 0,
                unit: "",
                minQuantity: 0,
                category: "",
                supplier: "",
                price: 0
            })
            fetchInventory()
        } catch (error) {
            console.error("Error creating inventory item:", error)
            toast.error("Failed to create inventory item")
        }
    }

    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        try {
            const response = await fetch(`/api/inventory/${itemId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ quantity: newQuantity }),
            })

            if (!response.ok) {
                throw new Error("Failed to update quantity")
            }

            toast.success("Quantity updated successfully")
            fetchInventory()
            fetchAlerts()
        } catch (error) {
            console.error("Error updating quantity:", error)
            toast.error("Failed to update quantity")
        }
    }

    const handleResolveAlert = async (alertId: string) => {
        try {
            const response = await fetch(`/api/inventory/alerts/${alertId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ isResolved: true }),
            })

            if (!response.ok) {
                throw new Error("Failed to resolve alert")
            }

            toast.success("Alert resolved successfully")
            fetchAlerts()
        } catch (error) {
            console.error("Error resolving alert:", error)
            toast.error("Failed to resolve alert")
        }
    }

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/login" })
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <Link href="/bartender">
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Wine className="h-4 w-4" />
                                    Switch to Bartender View
                                </Button>
                            </Link>
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
                            Admin Dashboard
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Manage your bar's performance and analytics
                        </p>
                    </motion.div>

                    {/* User Management Section */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                User Management
                            </h2>
                            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Bartender
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Bartender</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Create User
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map((user) => (
                                <Card key={user.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                {user.email}
                                            </CardTitle>
                                            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                                {user.role}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-muted-foreground">
                                                Created: {new Date(user.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Inventory Management Section */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Inventory Management
                            </h2>
                            <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Item
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Inventory Item</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateInventoryItem} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                value={newItem.name}
                                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Input
                                                id="description"
                                                value={newItem.description}
                                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="quantity">Quantity</Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    value={newItem.quantity}
                                                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="unit">Unit</Label>
                                                <Select
                                                    value={newItem.unit}
                                                    onValueChange={(value: string) => setNewItem({ ...newItem, unit: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select unit" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ml">ml</SelectItem>
                                                        <SelectItem value="oz">oz</SelectItem>
                                                        <SelectItem value="bottles">Bottles</SelectItem>
                                                        <SelectItem value="cans">Cans</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="minQuantity">Minimum Quantity</Label>
                                                <Input
                                                    id="minQuantity"
                                                    type="number"
                                                    value={newItem.minQuantity}
                                                    onChange={(e) => setNewItem({ ...newItem, minQuantity: parseFloat(e.target.value) })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="category">Category</Label>
                                                <Select
                                                    value={newItem.category}
                                                    onValueChange={(value: string) => setNewItem({ ...newItem, category: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Spirits">Spirits</SelectItem>
                                                        <SelectItem value="Beer">Beer</SelectItem>
                                                        <SelectItem value="Wine">Wine</SelectItem>
                                                        <SelectItem value="Mixers">Mixers</SelectItem>
                                                        <SelectItem value="Garnishes">Garnishes</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="supplier">Supplier</Label>
                                            <Input
                                                id="supplier"
                                                value={newItem.supplier}
                                                onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Price per Unit</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                step="0.01"
                                                value={newItem.price}
                                                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Create Item
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Inventory Alerts */}
                        {alerts.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3">Active Alerts</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {alerts.map((alert) => (
                                        <Card key={alert.id} className="bg-red-50 dark:bg-red-900/20">
                                            <CardHeader>
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                                    <CardTitle className="text-red-700 dark:text-red-400">
                                                        {alert.type}
                                                    </CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                                                    {alert.message}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleResolveAlert(alert.id)}
                                                >
                                                    Resolve Alert
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inventory Items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {inventory.map((item) => (
                                <Card key={item.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                {item.name}
                                            </CardTitle>
                                            <Badge variant={item.quantity <= item.minQuantity ? "destructive" : "default"}>
                                                {item.quantity} {item.unit}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="text-sm text-muted-foreground">
                                                {item.description}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="font-medium">Category:</span> {item.category}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Supplier:</span> {item.supplier || "N/A"}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Min Quantity:</span> {item.minQuantity} {item.unit}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Price:</span> ${item.price.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value))}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground self-center">
                                                    {item.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Payment Analytics */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                            Payment Analytics
                        </h2>
                        <PaymentAnalytics orders={orders} />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">
                                    ${orders
                                        .filter(order => order.paymentStatus === "PAID")
                                        .reduce((sum, order) => sum + order.total, 0)
                                        .toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Orders</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{orders.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Success Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {orders.length > 0
                                        ? `${Math.round(
                                            (orders.filter(order => order.paymentStatus === "PAID").length /
                                                orders.length) *
                                            100
                                        )}%`
                                        : "0%"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Orders */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                            Recent Orders
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orders.slice(0, 6).map((order) => (
                                <Card key={order.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle>Table {order.tableNumber}</CardTitle>
                                            <Badge variant={order.paymentStatus === "PAID" ? "success" : "default"}>
                                                {order.paymentStatus}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Payment ID: {order.paymentId}
                                            </p>
                                            <p className="text-lg font-bold">
                                                ${order.total.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(order.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 