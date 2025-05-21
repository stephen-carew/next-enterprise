"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Wine } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8 md:mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Welcome to Self-Service Bartender
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Order your favorite drinks directly from your table. Quick, easy, and contactless.
              </p>
            </motion.div>

            <motion.div
              key="scanner-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Wine className="h-6 w-6" />
                    <CardTitle className="text-2xl text-center text-gray-900 dark:text-gray-100">
                      Scan Your Table QR Code
                    </CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan the QR code on your table to start ordering
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-6">
                    <Button
                      variant="default"
                      className="w-full h-12 text-lg font-medium"
                      onClick={() => router.push("/scan")}
                    >
                      Open Scanner
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
