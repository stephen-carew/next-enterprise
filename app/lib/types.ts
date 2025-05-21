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
