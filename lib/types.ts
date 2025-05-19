export interface Drink {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrderDrink {
  id: string
  orderId: string
  drinkId: string
  quantity: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  Drink: Drink
}

export interface CreateOrderDrink {
  drinkId: string
  quantity: number
  notes?: string
}

export interface Table {
  id: string
  number: number
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  tableId: string
  status: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED"
  total: number
  OrderDrink: OrderDrink[]
  table: Table
  createdAt: Date
  updatedAt: Date
}

export interface CreateDrinkRequest {
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
}

export interface CreateOrderRequest {
  tableId: string
  items: Array<{
    drinkId: string
    quantity: number
    notes?: string
    price: number
  }>
}

export interface OrderItem {
  drinkId: string
  quantity: number
  notes?: string
  price: number
  drink: Drink
}

export interface CreateOrderItem {
  drinkId: string
  quantity: number
  price: number
  drink: Drink
}

export interface UpdateOrderRequest {
  status: string
}
