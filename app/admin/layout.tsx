"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()

    useEffect(() => {
        // Check if user is authenticated as admin
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/auth/check")
                if (!response.ok) {
                    router.push("/login")
                    toast.error("Please log in to access admin features")
                }
            } catch (error) {
                console.error("Auth check failed:", error)
                router.push("/login")
                toast.error("Authentication failed")
            }
        }

        checkAuth()
    }, [router])

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 flex">
                        <a className="mr-6 flex items-center space-x-2" href="/admin">
                            <span className="font-bold">Admin Dashboard</span>
                        </a>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <a
                                href="/admin/qr-codes"
                                className="transition-colors hover:text-foreground/80"
                            >
                                QR Codes
                            </a>
                            <a
                                href="/admin/tables"
                                className="transition-colors hover:text-foreground/80"
                            >
                                Tables
                            </a>
                            <a
                                href="/admin/orders"
                                className="transition-colors hover:text-foreground/80"
                            >
                                Orders
                            </a>
                        </nav>
                    </div>
                    <div className="flex flex-1 items-center justify-end space-x-2">
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            <main className="container py-6">{children}</main>
        </div>
    )
} 