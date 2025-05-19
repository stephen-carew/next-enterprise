import Image from "next/image";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useOrderStore } from "../lib/store";
import { Drink } from "../lib/types";


interface DrinkCardProps {
    drink: Drink;
}

export function DrinkCard({ drink }: DrinkCardProps) {
    const addItem = useOrderStore((state) => state.addItem);

    const handleAddToOrder = () => {
        addItem({
            drinkId: drink.id,
            quantity: 1,
            price: drink.price,
            drink,
        });
    };

    return (
        <Card className="overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {drink.imageUrl && (
                <div className="relative h-48 w-full">
                    <Image
                        src={drink.imageUrl}
                        alt={drink.name}
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">{drink.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {drink.description}
                </p>
                <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-gray-100">${drink.price.toFixed(2)}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddToOrder}
                        className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Add to Order
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 