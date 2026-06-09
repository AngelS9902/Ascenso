import { create } from 'zustand'

// Estado de UI efímero (no se persiste): controla el modal de cantidad.
export const useUI = create((set) => ({
  quantifyAction: null,
  openQuantify: (action) => set({ quantifyAction: action }),
  closeQuantify: () => set({ quantifyAction: null }),
}))
