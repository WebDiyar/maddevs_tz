import { create } from 'zustand';
import type { Booking } from '@/entities/booking';

export type BookingEditor =
  { mode: 'create'; date: string; start: string; end: string } | { mode: 'edit'; booking: Booking };

type State = {
  editor: BookingEditor | null;
  isEditorOpen: boolean;
  deleting: Booking | null;
  openCreate: (date: string, start: string, end: string) => void;
  openEdit: (booking: Booking) => void;
  closeEditor: () => void;
  askDelete: (booking: Booking) => void;
  closeDelete: () => void;
};

export const useBookingPageStore = create<State>()((set) => ({
  editor: null,
  isEditorOpen: false,
  deleting: null,
  openCreate: (date, start, end) =>
    set({ editor: { mode: 'create', date, start, end }, isEditorOpen: true }),
  openEdit: (booking) => set({ editor: { mode: 'edit', booking }, isEditorOpen: true }),
  closeEditor: () => set({ isEditorOpen: false }),
  askDelete: (deleting) => set({ deleting }),
  closeDelete: () => set({ deleting: null }),
}));
