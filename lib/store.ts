import { create } from "zustand"
import { CreateOrderItem, OrderItem } from "./types"

interface OrderState {
  tableNumber: number | null
  items: OrderItem[]
  setTableNumber: (number: number) => void
  addItem: (item: CreateOrderItem) => void
  removeItem: (drinkId: string) => void
  updateItemQuantity: (drinkId: string, quantity: number) => void
  clearOrder: () => void
}

export const useOrderStore = create<OrderState>((set) => ({
  tableNumber: null,
  items: [],
  setTableNumber: (number) => set({ tableNumber: number }),
  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.drinkId === item.drinkId)
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.drinkId === item.drinkId ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        }
      }
      return { items: [...state.items, item as OrderItem] }
    }),
  removeItem: (drinkId) =>
    set((state) => ({
      items: state.items.filter((item) => item.drinkId !== drinkId),
    })),
  updateItemQuantity: (drinkId, quantity) =>
    set((state) => ({
      items: state.items.map((item) => (item.drinkId === drinkId ? { ...item, quantity } : item)),
    })),
  clearOrder: () => set({ items: [], tableNumber: null }),
}))
