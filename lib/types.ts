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
  notes: string | null
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
  paymentId: string
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  paymentMethod: "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH"
  paymentDetails?: {
    last4?: string
    cardType?: string
    expiryDate?: string
  }
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  total: number
  items: {
    drinkId: string
    quantity: number
    price: number
  }[]
  OrderDrink: OrderDrink[]
  table: Table
  createdAt: string
  updatedAt: string
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
  paymentMethod: "CASH" | "CARD"
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

export interface InventoryItem {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  minQuantity: number
  category: string
  supplier?: string
  price: number
  createdAt: Date
  updatedAt: Date
  alerts?: InventoryAlert[]
}

export interface InventoryAlert {
  id: string
  inventoryItemId: string
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING"
  message: string
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
  inventoryItem?: InventoryItem
}
