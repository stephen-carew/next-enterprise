"use client"

import { Html5Qrcode } from "html5-qrcode"
import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void
    onScanError?: (error: string) => void
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const scanRegionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        Html5Qrcode.getCameras().then(devices => {
            setCameras(devices)
            if (devices.length > 0) setSelectedCamera(devices[0]!.id)
        })
        return () => {
            const scanner = scannerRef.current
            if (scanner) {
                scanner.stop().catch(() => { })
                scanner.clear()
            }
        }
    }, [])

    const startScan = async () => {
        if (!selectedCamera) return
        setIsScanning(true)
        scannerRef.current = new Html5Qrcode("custom-qr-region")
        try {
            await scannerRef.current.start(
                { deviceId: { exact: selectedCamera } },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    setIsScanning(false)
                    onScanSuccess(decodedText)
                    if (scannerRef.current) {
                        scannerRef.current.stop()
                    }
                },
                (error) => {
                    if (onScanError) onScanError(error)
                }
            )
        } catch (err: unknown) {
            console.error(err)
            setIsScanning(false)
            if (onScanError) onScanError(err instanceof Error ? err.message : String(err))
        }
    }

    const stopScan = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => setIsScanning(false))
        }
    }

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
            <div className="mb-4 flex gap-2 items-center w-full">
                <Select
                    value={selectedCamera || undefined}
                    onValueChange={setSelectedCamera}
                    disabled={isScanning || cameras.length === 0}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Camera" />
                    </SelectTrigger>
                    <SelectContent>
                        {cameras.map(cam => (
                            <SelectItem key={cam.id} value={cam.id}>{cam.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!isScanning ? (
                    <Button onClick={startScan} disabled={!selectedCamera}>
                        Start Scanning
                    </Button>
                ) : (
                    <Button onClick={stopScan} variant="destructive">
                        Stop Scanning
                    </Button>
                )}
            </div>
            <div
                id="custom-qr-region"
                ref={scanRegionRef}
                className="w-full aspect-square rounded-lg border-2 border-primary flex items-center justify-center bg-background"
            >
                {!isScanning && (
                    <span className="text-muted-foreground">Camera preview will appear here</span>
                )}
            </div>
            {isScanning && (
                <div className="mt-4 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Scanning...</span>
                </div>
            )}
        </div>
    )
} 