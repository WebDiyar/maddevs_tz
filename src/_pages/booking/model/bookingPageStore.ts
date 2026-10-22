import { create } from 'zustand';
import type { Booking } from '@/entities/booking';

export type BookingEditor =
  { mode: 'create'; start: string | null } | { mode: 'edit'; booking: Booking };

type State = {
  selectedDate: string | null;
  editor: BookingEditor | null;
  isEditorOpen: boolean;
  deleting: Booking | null;
  selectDate: (date: string) => void;
  openCreate: (start?: string) => void;
  openEdit: (booking: Booking) => void;
  closeEditor: () => void;
  askDelete: (booking: Booking) => void;
  closeDelete: () => void;
};

export const useBookingPageStore = create<State>()((set) => ({
  selectedDate: null,
  editor: null,
  isEditorOpen: false,
  deleting: null,
  selectDate: (selectedDate) => set({ selectedDate }),
  openCreate: (start) =>
    set({ editor: { mode: 'create', start: start ?? null }, isEditorOpen: true }),
  openEdit: (booking) => set({ editor: { mode: 'edit', booking }, isEditorOpen: true }),
  closeEditor: () => set({ isEditorOpen: false }),
  askDelete: (deleting) => set({ deleting }),
  closeDelete: () => set({ deleting: null }),
}));
