"use client";
import { AnimatePresence, motion } from "framer-motion";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { DrinkCard } from "../components/DrinkCard";
import { OrderSummary } from "../components/OrderSummary";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { useOrderStore } from "../lib/store";
import { Drink } from "../lib/types";

export default function Home() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tempTableNumber, setTempTableNumber] = useState<number | null>(null);
  const { tableNumber, setTableNumber } = useOrderStore();

  useEffect(() => {
    fetchDrinks();
  }, []);

  const fetchDrinks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/drinks");
      console.log("API Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response data:", data);
      console.log("Data type:", typeof data);
      console.log("Is Array?", Array.isArray(data));

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected an array");
      }

      setDrinks(data as Drink[]);
    } catch (error) {
      console.error("Failed to fetch drinks:", error);
      toast.error("Failed to load drinks. Please try again.");
      setDrinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!tempTableNumber) {
      toast.error("Please enter a table number");
      return;
    }
    setTableNumber(tempTableNumber);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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

          <AnimatePresence mode="wait">
            {!tableNumber ? (
              <motion.div
                key="table-input"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="max-w-md mx-auto"
              >
                <Card className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-2xl text-center text-gray-900 dark:text-gray-100">Enter Your Table Number</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="tableNumber" className="text-lg font-medium text-gray-700 dark:text-gray-300">Table Number</Label>
                        <Input
                          id="tableNumber"
                          type="number"
                          placeholder="Enter your table number"
                          min={1}
                          value={tempTableNumber || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTempTableNumber(Number(e.target.value))
                          }
                          className="h-12 text-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                        />
                      </div>
                      <Button
                        variant="default"
                        className="w-full h-12 text-lg font-medium"
                        onClick={handleNext}
                      >
                        Continue to Menu
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8"
              >
                <div className="lg:col-span-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100"></div>
                      <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">Loading our delicious drinks...</p>
                    </div>
                  ) : drinks.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-lg text-gray-600 dark:text-gray-400">No drinks available at the moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {drinks.map((drink) => (
                        <DrinkCard key={drink.id} drink={drink} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-4">
                    <OrderSummary />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
