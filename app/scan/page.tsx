"use client"

import { SignJWT } from "jose"
import { QrCode, Wine, } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { QRScanner } from "@/components/qr-scanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type VerifyResponse = {
    tableId: string
}

type ErrorResponse = {
    error: string
}

type TableLookupResponse = {
    table: {
        id: string;
        number: number;
    };
}

export default function ScanPage() {
    const router = useRouter()
    const [isSecureContext, setIsSecureContext] = useState(true)
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
    const [tableNumber, setTableNumber] = useState("")

    useEffect(() => {
        // Check if we're in a secure context
        const isSecure = window.isSecureContext
        setIsSecureContext(isSecure)

        if (!isSecure) {
            toast.error("Camera access requires a secure connection (HTTPS)")
            return
        }

        // Check camera permissions
        const checkCameraPermission = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const hasVideoInput = devices.some(device => device.kind === 'videoinput')

                if (!hasVideoInput) {
                    setHasCameraPermission(false)
                    toast.error("No camera found on your device")
                    return
                }

                // Request camera permission
                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                stream.getTracks().forEach(track => track.stop()) // Stop the stream immediately
                setHasCameraPermission(true)
            } catch (error) {
                console.error("Camera permission error:", error)
                setHasCameraPermission(false)
                if (error instanceof Error) {
                    if (error.name === 'NotAllowedError') {
                        toast.error("Camera access was denied. Please allow camera access to scan QR codes.")
                    } else if (error.name === 'NotFoundError') {
                        toast.error("No camera found on your device")
                    } else {
                        toast.error("Error accessing camera: " + error.message)
                    }
                }
            }
        }

        checkCameraPermission()
    }, [])

    const handleScan = async (decodedText: string) => {
        try {

            // Basic validation of the scanned text
            if (!decodedText || typeof decodedText !== 'string' || decodedText.length < 10) {
                throw new Error("Invalid QR code format")
            }

            // Verify the token and create a session
            const response = await fetch("/api/tables/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: decodedText }),
            })

            const responseData = await response.json() as VerifyResponse | ErrorResponse

            if (!response.ok) {
                throw new Error('error' in responseData ? responseData.error : "Invalid QR code")
            }

            const { tableId } = responseData as VerifyResponse

            // Set the session cookie with appropriate flags based on environment
            const isSecure = window.location.protocol === 'https:'
            const cookieValue = `table_session=${decodedText}; path=/; max-age=${6 * 60 * 60}${isSecure ? '; secure' : ''}; samesite=lax`
            document.cookie = cookieValue

            // Verify cookie was set
            const cookies = document.cookie.split(';')
            const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('table_session='))

            if (!sessionCookie) {
                throw new Error("Failed to set session cookie")
            }

            // Show success message
            toast.success("Table verified! Redirecting...")

            // Wait a moment for the cookie to be set
            await new Promise(resolve => setTimeout(resolve, 100))

            // Try direct navigation
            window.location.href = `/tables/${tableId}/order`
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invalid QR code. Please try again.")
            // Don't restart scanner on error, let user click the restart button
        }
    }

    const handleManualEntry = async () => {
        const number = parseInt(tableNumber)
        if (isNaN(number) || number <= 0) {
            toast.error("Please enter a valid table number")
            return
        }

        try {
            // Look up table by number
            const response = await fetch(`/api/tables/lookup?number=${number}`)
            if (!response.ok) {
                throw new Error("Table not found")
            }

            const data = (await response.json()) as TableLookupResponse
            if (!data.table || !data.table.id) {
                throw new Error("Table not found")
            }

            // Generate a permanent token for the table
            const token = await new SignJWT({
                tableId: data.table.id,
                tableNumber: data.table.number,
                type: "permanent", // Mark this as a permanent token
            })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .sign(new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || "your-secret-key"))

            // Store the permanent token in Redis
            await fetch(`/api/tables/qr?tableId=${data.table.id}`)

            // Set the session cookie with security flags - 6 hour expiration
            const isSecure = window.location.protocol === 'https:'
            document.cookie = `table_session=${token}; path=/; max-age=${6 * 60 * 60}${isSecure ? '; secure' : ''}; samesite=lax`

            // Store session in Redis through the verify endpoint
            await fetch("/api/tables/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            })

            // Redirect to the table's order page
            router.push(`/tables/${data.table.id}/order`)
        } catch (error) {
            console.error("Table lookup error:", error)
            toast.error("Table not found. Please check the number and try again.")
        }
    }

    const handleRetryCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(track => track.stop())
            setHasCameraPermission(true)

        } catch (error) {
            console.error("Camera retry error:", error)
            toast.error("Failed to access camera. Please check your camera permissions.")
        }
    }

    if (!isSecureContext || hasCameraPermission === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <Wine className="h-6 w-6" />
                            <CardTitle className="text-2xl">Enter Table Number</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {!isSecureContext
                                ? "Camera access is not available. Please enter your table number manually."
                                : "Camera access was denied. Please enter your table number manually."}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tableNumber">Table Number</Label>
                                <Input
                                    id="tableNumber"
                                    type="number"
                                    min="1"
                                    placeholder="Enter your table number"
                                    value={tableNumber}
                                    onChange={(e) => setTableNumber(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="h-12 text-lg"
                                />
                            </div>
                            <Button
                                variant="default"
                                className="w-full"
                                onClick={handleManualEntry}
                            >
                                Continue to Menu
                            </Button>
                            {hasCameraPermission === false && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleRetryCamera}
                                >
                                    Retry Camera Access
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push("/")}
                            >
                                Return to Home
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center py-8">

            <main className="flex flex-col items-center justify-center w-full flex-1">
                {isSecureContext && hasCameraPermission && (
                    <Card className="w-full max-w-lg mx-auto shadow-lg border border-muted bg-card">
                        <CardHeader className="flex flex-col items-center pb-2">
                            <CardTitle className="flex items-center gap-2 text-2xl font-semibold mb-1">
                                <QrCode className="h-5 w-5" />
                                QR Code Scanner
                            </CardTitle>
                            <p className="text-muted-foreground text-sm text-center">Scan the QR code on your table to start ordering</p>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 pt-0 w-full">
                            <QRScanner
                                onScanSuccess={handleScan}
                                onScanError={(error) => toast.error(error)}
                            />
                        </CardContent>
                    </Card>
                )}
                {/* ... manual entry and other UI ... */}
            </main>
        </div>
    )
} 