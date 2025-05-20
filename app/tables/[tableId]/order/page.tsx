'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Drink, Order, Table } from '@/types/table';

interface TableWithOrders extends Table {
    orders: Order[];
    hasActiveOrders: boolean;
    activeOrders: Order[];
}

interface CartItem {
    drink: Drink;
    quantity: number;
    notes: string;
}

interface DrinksResponse {
    drinks: Drink[];
}

interface TableResponse {
    table: TableWithOrders;
    hasActiveOrders: boolean;
    activeOrders: Order[];
}

interface ErrorResponse {
    error: string;
}

export default function OrderPage({ params }: { params: Promise<{ tableId: string }> }) {
    const [table, setTable] = useState<TableWithOrders | null>(null);
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            const { tableId } = await params;
            await Promise.all([
                fetchTable(tableId),
                fetchDrinks(),
            ]);
        };
        loadData();
    }, [params]);

    const fetchTable = async (tableId: string) => {
        try {
            const response = await fetch(`/api/tables/lookup?id=${tableId}`);
            if (!response.ok) throw new Error('Failed to fetch table');
            const data = await response.json() as TableResponse;
            console.log('Table data:', data); // Debug log
            if (!data.table) {
                console.error('Table data is not in expected format:', data);
                toast({
                    title: 'Error',
                    description: 'Table not found',
                    variant: 'destructive',
                });
                router.push('/');
                return;
            }
            setTable(data.table);
        } catch (error) {
            console.error('Error fetching table:', error);
            toast({
                title: 'Error',
                description: 'Failed to load table data',
                variant: 'destructive',
            });
            router.push('/');
        }
    };

    const fetchDrinks = async () => {
        try {
            const response = await fetch('/api/drinks');
            if (!response.ok) throw new Error('Failed to fetch drinks');
            const data = await response.json() as DrinksResponse;
            console.log('Drinks data:', data); // Debug log
            if (!data.drinks || !Array.isArray(data.drinks)) {
                console.error('Drinks data is not in expected format:', data);
                setDrinks([]);
                return;
            }
            setDrinks(data.drinks);
        } catch (error) {
            console.error('Error fetching drinks:', error);
            toast({
                title: 'Error',
                description: 'Failed to load drinks',
                variant: 'destructive',
            });
            setDrinks([]); // Set empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    const addToCart = (drink: Drink) => {
        setCart(prev => {
            const existingItem = prev.find(item => item.drink.id === drink.id);
            if (existingItem) {
                return prev.map(item =>
                    item.drink.id === drink.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { drink, quantity: 1, notes: '' }];
        });
    };

    const removeFromCart = (drinkId: string) => {
        setCart(prev => prev.filter(item => item.drink.id !== drinkId));
    };

    const updateQuantity = (drinkId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(drinkId);
            return;
        }
        setCart(prev =>
            prev.map(item =>
                item.drink.id === drinkId
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const updateNotes = (drinkId: string, notes: string) => {
        setCart(prev =>
            prev.map(item =>
                item.drink.id === drinkId
                    ? { ...item, notes }
                    : item
            )
        );
    };

    const handleSubmitOrder = async () => {
        if (!table || cart.length === 0) return;

        try {
            const orderItems = cart.map(item => ({
                drinkId: item.drink.id,
                quantity: item.quantity,
                notes: item.notes,
                price: item.drink.price
            }));

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tableId: table.id,
                    items: orderItems,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json() as ErrorResponse;
                throw new Error(errorData.error || 'Failed to create order');
            }

            const orderData = await response.json();
            console.log('Order created:', orderData);

            toast({
                title: 'Success',
                description: 'Order placed successfully',
            });

            router.push(`/tables/${table.id}`);
        } catch (error) {
            console.error('Error creating order:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to place order',
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 dark:border-gray-700 border-t-primary"></div>
            </div>
        );
    }

    const total = cart.reduce((sum, item) => sum + (item.drink.price * item.quantity), 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                            {table ? `Table ${table.number} - New Order` : 'Loading...'}
                        </h1>
                        <Button variant="outline" onClick={() => router.back()}>
                            Back
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Drinks Menu */}
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Menu
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {drinks.map((drink) => (
                                    <Card key={drink.id} className="bg-white dark:bg-gray-800">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{drink.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                                                {drink.description}
                                            </p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">
                                                    ${drink.price.toFixed(2)}
                                                </span>
                                                <Button
                                                    onClick={() => addToCart(drink)}
                                                    disabled={!drink.isAvailable}
                                                >
                                                    Add to Order
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Order Cart */}
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Your Order
                            </h2>
                            {cart.length === 0 ? (
                                <Card className="bg-white dark:bg-gray-800">
                                    <CardContent className="pt-6">
                                        <p className="text-gray-600 dark:text-gray-400 text-center">
                                            Your cart is empty. Add some drinks to get started!
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-6">
                                        {cart.map((item) => (
                                            <Card key={item.drink.id} className="bg-white dark:bg-gray-800">
                                                <CardContent className="pt-6">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-semibold">{item.drink.name}</h3>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                ${item.drink.price.toFixed(2)} each
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFromCart(item.drink.id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => updateQuantity(item.drink.id, item.quantity - 1)}
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="w-8 text-center">{item.quantity}</span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => updateQuantity(item.drink.id, item.quantity + 1)}
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Add notes..."
                                                            className="flex-1 px-3 py-2 border rounded-md"
                                                            value={item.notes}
                                                            onChange={(e) => updateNotes(item.drink.id, e.target.value)}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <Card className="bg-white dark:bg-gray-800">
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-lg font-semibold">Total</span>
                                                <span className="text-2xl font-bold">
                                                    ${total.toFixed(2)}
                                                </span>
                                            </div>
                                            <Button
                                                className="w-full"
                                                onClick={handleSubmitOrder}
                                            >
                                                Place Order
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 