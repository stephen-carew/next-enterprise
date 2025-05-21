"use client"

import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Table {
    id: string
    number: number
    createdAt: Date
    updatedAt: Date
}

export default function TablesPage() {
    const [tables, setTables] = useState<Table[]>([])
    const [newTableNumber, setNewTableNumber] = useState("")

    useEffect(() => {
        fetchTables()
    }, [])

    const fetchTables = async () => {
        try {
            const response = await fetch("/api/tables")
            if (!response.ok) {
                throw new Error("Failed to fetch tables")
            }
            const data = await response.json() as Table[]
            setTables(data)
        } catch (error) {
            console.error("Error fetching tables:", error)
            toast.error("Failed to load tables")
        }
    }

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault()
        const number = parseInt(newTableNumber)
        if (isNaN(number) || number <= 0) {
            toast.error("Please enter a valid table number")
            return
        }

        try {
            const response = await fetch("/api/tables", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ number }),
            })

            if (!response.ok) {
                throw new Error("Failed to create table")
            }

            toast.success("Table created successfully")
            setNewTableNumber("")
            fetchTables()
        } catch (error) {
            console.error("Error creating table:", error)
            toast.error("Failed to create table")
        }
    }

    const handleDeleteTable = async (tableId: string) => {
        if (!confirm("Are you sure you want to delete this table?")) return

        try {
            const response = await fetch(`/api/tables/${tableId}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                throw new Error("Failed to delete table")
            }

            toast.success("Table deleted successfully")
            fetchTables()
        } catch (error) {
            console.error("Error deleting table:", error)
            toast.error("Failed to delete table")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Tables Management</h2>
                <form onSubmit={handleCreateTable} className="flex gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input
                            id="tableNumber"
                            type="number"
                            min="1"
                            placeholder="Enter table number"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-32"
                        />
                    </div>
                    <Button type="submit" className="self-end">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Table
                    </Button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => (
                    <Card key={table.id}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Table {table.number}</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTable(table.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Created: {new Date(table.createdAt).toLocaleDateString()}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
} 