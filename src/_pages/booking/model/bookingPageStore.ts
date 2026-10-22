import { create } from 'zustand';
import type { Booking } from '@/entities/booking';

export type BookingEditor =
  { mode: 'create'; date: string; start: string } | { mode: 'edit'; booking: Booking };

type State = {
  selectedDate: string | null;
  editor: BookingEditor | null;
  isEditorOpen: boolean;
  deleting: Booking | null;
  selectDate: (date: string) => void;
  openCreate: (date: string, start: string) => void;
  openEdit: (booking: Booking) => void;
  closeEditor: () => void;
  finishEditor: (date: string) => void;
  askDelete: (booking: Booking) => void;
  closeDelete: () => void;
};

export const useBookingPageStore = create<State>()((set) => ({
  selectedDate: null,
  editor: null,
  isEditorOpen: false,
  deleting: null,
  selectDate: (selectedDate) => set({ selectedDate }),
  openCreate: (date, start) => set({ editor: { mode: 'create', date, start }, isEditorOpen: true }),
  openEdit: (booking) => set({ editor: { mode: 'edit', booking }, isEditorOpen: true }),
  closeEditor: () => set({ isEditorOpen: false }),
  finishEditor: (selectedDate) => set({ isEditorOpen: false, selectedDate }),
  askDelete: (deleting) => set({ deleting }),
  closeDelete: () => set({ deleting: null }),
}));
