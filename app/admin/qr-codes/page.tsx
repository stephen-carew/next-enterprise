"use client"

import { jsPDF } from "jspdf"
import { Wine } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TableResponse {
    table: {
        id: string
        number: number
    }
}

interface QRCodeResponse {
    qrCode: string
}

export default function QRCodePage() {
    const [startTable, setStartTable] = useState("")
    const [endTable, setEndTable] = useState("")
    const [generating, setGenerating] = useState(false)
    const [qrCodes, setQrCodes] = useState<Array<{ number: number; qrCode: string }>>([])

    const generateQRCode = async (tableNumber: number) => {
        try {
            // First, get or create the table
            const tableResponse = await fetch(`/api/tables/lookup?number=${tableNumber}`)
            if (!tableResponse.ok) {
                throw new Error(`Failed to find or create table ${tableNumber}`)
            }

            const tableData = await tableResponse.json() as TableResponse
            if (!tableData.table || !tableData.table.id) {
                throw new Error(`Table ${tableNumber} not found`)
            }

            // Then generate the QR code
            const qrResponse = await fetch(`/api/tables/qr?tableId=${tableData.table.id}`)
            if (!qrResponse.ok) {
                throw new Error(`Failed to generate QR code for table ${tableNumber}`)
            }

            const { qrCode } = await qrResponse.json() as QRCodeResponse
            return { number: tableNumber, qrCode }
        } catch (error) {
            console.error(`Error generating QR code for table ${tableNumber}:`, error)
            throw error
        }
    }

    const handleBatchGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        const start = parseInt(startTable)
        const end = parseInt(endTable)

        if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start > end) {
            toast.error("Please enter valid table numbers")
            return
        }

        setGenerating(true)
        setQrCodes([])

        try {
            const codes = []
            for (let i = start; i <= end; i++) {
                try {
                    const code = await generateQRCode(i)
                    codes.push(code)
                    toast.success(`Generated QR code for Table ${i}`)
                } catch (error) {
                    console.error(`Error generating QR code for Table ${i}:`, error)
                    toast.error(`Failed to generate QR code for Table ${i}`)
                }
            }
            setQrCodes(codes)
            toast.success("Batch generation completed")
        } catch (error) {
            console.error("Error in batch generation:", error)
            toast.error("Failed to generate QR codes")
        } finally {
            setGenerating(false)
        }
    }

    const downloadPDF = async () => {
        if (qrCodes.length === 0) {
            toast.error("No QR codes to download")
            return
        }

        const pdf = new jsPDF()
        const qrSize = 100 // Size of QR code in PDF
        const margin = 20
        const spacing = 20
        const itemsPerPage = 4

        for (let i = 0; i < qrCodes.length; i++) {
            const code = qrCodes[i]
            if (!code) continue

            if (i > 0 && i % itemsPerPage === 0) {
                pdf.addPage()
            }

            const itemIndex = i % itemsPerPage
            const x = margin + (itemIndex % 2) * (qrSize + spacing)
            const y = margin + Math.floor(itemIndex / 2) * (qrSize + spacing + 20)

            try {
                // Add QR code
                const qrImage = await fetch(code.qrCode).then(res => res.blob())
                const qrUrl = URL.createObjectURL(qrImage)
                pdf.addImage(qrUrl, 'PNG', x, y, qrSize, qrSize)

                // Add table number
                pdf.setFontSize(12)
                pdf.text(`Table ${code.number}`, x + qrSize / 2, y + qrSize + 10, { align: 'center' })

                URL.revokeObjectURL(qrUrl)
            } catch (error) {
                console.error(`Error adding QR code for table ${code.number} to PDF:`, error)
                toast.error(`Failed to add table ${code.number} to PDF`)
            }
        }

        pdf.save(`table-qr-codes-${startTable}-${endTable}.pdf`)
        toast.success("PDF downloaded successfully")
    }

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Wine className="h-6 w-6" />
                        <CardTitle>Generate Table QR Codes</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <form onSubmit={handleBatchGenerate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTable">Start Table Number</Label>
                                    <Input
                                        id="startTable"
                                        type="number"
                                        min="1"
                                        placeholder="Enter start table number"
                                        value={startTable}
                                        onChange={(e) => setStartTable(e.target.value.replace(/[^0-9]/g, ""))}
                                        className="h-12 text-lg"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endTable">End Table Number</Label>
                                    <Input
                                        id="endTable"
                                        type="number"
                                        min="1"
                                        placeholder="Enter end table number"
                                        value={endTable}
                                        onChange={(e) => setEndTable(e.target.value.replace(/[^0-9]/g, ""))}
                                        className="h-12 text-lg"
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={generating}
                                className="w-full"
                            >
                                {generating ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    "Generate QR Codes"
                                )}
                            </Button>
                        </form>

                        {qrCodes.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">
                                        Generated QR Codes ({qrCodes.length})
                                    </h3>
                                    <Button
                                        onClick={downloadPDF}
                                        variant="outline"
                                    >
                                        Download All as PDF
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {qrCodes.map((code) => (
                                        <div key={code.number} className="flex flex-col items-center gap-2">
                                            <div className="p-2 bg-white rounded-lg relative">
                                                <div className="absolute top-0 left-0 right-0 bg-black/80 text-white text-center py-1 px-2 rounded-t-lg">
                                                    Table {code.number}
                                                </div>
                                                <Image
                                                    src={code.qrCode}
                                                    alt={`Table ${code.number} QR Code`}
                                                    width={128}
                                                    height={128}
                                                    className="w-32 h-32 mt-6"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 