"use client"

import { IDetectedBarcode, outline, Scanner } from '@yudiel/react-qr-scanner'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void
    onScanError?: (error: string) => void
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
    const [selectedCameraId, setSelectedCameraId] = useState<string>()
    const [scanning, setScanning] = useState(false)

    useEffect(() => {
        console.log('[QR] Enumerating devices')
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const videoInputs = devices.filter(d => d.kind === 'videoinput')
                console.log('[QR] Video inputs:', videoInputs)
                setCameras(videoInputs)
                if (videoInputs.length) setSelectedCameraId(videoInputs[0]!.deviceId)
            })
            .catch(err => {
                console.error('[QR] enumerateDevices error:', err)
                onScanError?.(String(err))
            })
    }, [])

    const handleScan = (codes: IDetectedBarcode[]) => {
        console.log('[QR] handleScan called', codes);
        if (!scanning) return
        if (codes.length > 0 && codes[0]?.rawValue) {
            setScanning(false)
            onScanSuccess(codes[0].rawValue)
        }
    }

    const handleError = (error: unknown) => {
        console.error('[QR] Scanner error:', error)
        onScanError?.(error instanceof Error ? error.message : String(error))
    }

    const toggleScanning = () => {
        console.log('[QR] toggleScanning, current:', scanning)
        setScanning(prev => !prev)
    }

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
            <div className="mb-4 flex gap-2 items-center w-full">
                <Select
                    value={selectedCameraId}
                    onValueChange={val => { console.log('[QR] Camera selected:', val); setSelectedCameraId(val) }}
                    disabled={scanning || cameras.length === 0}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Camera" />
                    </SelectTrigger>
                    <SelectContent>
                        {cameras.map(cam => (
                            <SelectItem key={cam.deviceId} value={cam.deviceId}>
                                {cam.label || cam.deviceId}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={toggleScanning} disabled={!selectedCameraId}>
                    {scanning ? 'Stop Scanning' : 'Start Scanning'}
                </Button>
            </div>
            <div className="w-full aspect-square rounded-lg border-2 border-primary overflow-hidden">
                {selectedCameraId && scanning ? (
                    <Scanner

                        formats={[
                            'qr_code',
                            'micro_qr_code',
                            'rm_qr_code',
                        ]}
                        constraints={{
                            deviceId: selectedCameraId, facingMode: {
                                ideal: "environment",
                            },
                        }}
                        onScan={handleScan}
                        onError={handleError}
                        //paused={!scanning}
                        components={{
                            //onOff: true,
                            torch: true,
                            finder: true,
                            zoom: true,
                            tracker: outline
                        }}
                        scanDelay={2000}
                        sound={true}


                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-background">
                        <span className="text-muted-foreground">Camera preview will appear here</span>
                    </div>
                )}
            </div>
        </div>
    )
}
