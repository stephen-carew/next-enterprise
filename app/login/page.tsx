"use client"

import { Wine } from "lucide-react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            console.log("Attempting login for:", email)

            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            console.log("Sign in result:", result)

            if (result?.error) {
                setError(result.error)
                toast.error("Invalid email or password")
                return
            }

            // Check user role and redirect accordingly
            const response = await fetch("/api/auth/check-admin")
            console.log("Admin check response:", response.status)

            if (response.ok) {
                router.push("/admin")
            } else {
                router.push("/bartender")
            }
        } catch (error) {
            console.error("Login error:", error)
            setError("An unexpected error occurred")
            toast.error("An error occurred during login")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
            <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-full max-w-md">
                        <div className="flex flex-col space-y-2 text-center mb-8">
                            <div className="flex items-center justify-center space-x-2">
                                <Wine className="h-6 w-6" />
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Self-Service Bartender
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Sign in to access the bartender dashboard
                            </p>
                        </div>
                        <Card>
                            <CardContent className="pt-6">
                                <form onSubmit={onSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="bartender@example.com"
                                            required
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="w-full"
                                        />
                                    </div>
                                    {error && (
                                        <p className="text-sm text-red-500">
                                            {error}
                                        </p>
                                    )}
                                    <Button className="w-full" type="submit" disabled={isLoading}>
                                        {isLoading ? "Signing in..." : "Sign in"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:24px_24px]"></div>
            <div className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-b from-white via-white to-gray-100"></div>
        </div>
    )
} 