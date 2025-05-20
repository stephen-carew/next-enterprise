"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Order } from "@/lib/types"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface PaymentAnalyticsProps {
    orders: Order[]
}

interface PaymentStats {
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    paymentMethodDistribution: {
        method: string
        count: number
        percentage: number
    }[]
    paymentStatusDistribution: {
        status: string
        count: number
        percentage: number
    }[]
    hourlyRevenue: {
        hour: string
        revenue: number
    }[]
}

export function PaymentAnalytics({ orders }: PaymentAnalyticsProps) {
    const calculateStats = (): PaymentStats => {
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
        const totalOrders = orders.length
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Calculate payment method distribution
        const methodCounts = orders.reduce((acc, order) => {
            acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const paymentMethodDistribution = Object.entries(methodCounts).map(([method, count]) => ({
            method: method.replace("_", " "),
            count,
            percentage: (count / totalOrders) * 100
        }))

        // Calculate payment status distribution
        const statusCounts = orders.reduce((acc, order) => {
            acc[order.paymentStatus] = (acc[order.paymentStatus] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const paymentStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: (count / totalOrders) * 100
        }))

        // Calculate hourly revenue
        const hourlyRevenue = orders.reduce((acc, order) => {
            const hour = new Date(order.createdAt).getHours()
            const hourLabel = `${hour}:00`
            acc[hourLabel] = (acc[hourLabel] || 0) + order.total
            return acc
        }, {} as Record<string, number>)

        const hourlyRevenueData = Object.entries(hourlyRevenue)
            .map(([hour, revenue]) => ({ hour, revenue }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            paymentMethodDistribution,
            paymentStatusDistribution,
            hourlyRevenue: hourlyRevenueData
        }
    }

    const stats = calculateStats()

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Summary Cards */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">${stats.averageOrderValue.toFixed(2)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">
                        {((stats.paymentStatusDistribution.find(s => s.status === "PAID")?.percentage || 0)).toFixed(1)}%
                    </p>
                </CardContent>
            </Card>

            {/* Payment Method Distribution */}
            <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.paymentMethodDistribution.map(({ method, count, percentage }) => (
                            <div key={method} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{method}</span>
                                    <span>{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Hourly Revenue Chart */}
            <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                    <CardTitle>Hourly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.hourlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 