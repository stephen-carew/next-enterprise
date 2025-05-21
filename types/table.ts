export interface Table {
  id: string
  number: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  tableId: string
  status: "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED"
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  total: number
  createdAt: Date
  updatedAt: Date
  OrderDrink?: OrderDrink[]
}

export interface OrderDrink {
  id: string
  orderId: string
  drinkId: string
  quantity: number
  notes: string | null
  Drink?: Drink
}

export interface Drink {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl: string | null
  isAvailable: boolean
}
