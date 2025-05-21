"use client"

import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { QRScanner } from "@/components/qr-scanner"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TablePage({ params }: { params: { id: string } }) {
    const router = useRouter()

    const handleScanSuccess = (decodedText: string) => {
        try {
            const url = new URL(decodedText)
            const tableId = url.pathname.split('/').pop()
            if (tableId) {
                router.push(`/table/${tableId}`)
            }
        } catch (error) {
            console.error("QR scan error:", error)
            toast.error("Invalid QR code")
        }
    }

    const handleScanError = (error: string) => {
        console.error("QR scan error:", error)
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <h1 className="text-xl font-bold">Table {params.id}</h1>
                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={handleScanError}
                />
            </main>
        </div>
    )
} 