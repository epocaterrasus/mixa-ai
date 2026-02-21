import { create } from "zustand";

interface FindBarStore {
  isOpen: boolean;
  activeMatchOrdinal: number;
  totalMatches: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setResult: (ordinal: number, total: number) => void;
  resetResult: () => void;
}

export const useFindBarStore = create<FindBarStore>((set) => ({
  isOpen: false,
  activeMatchOrdinal: 0,
  totalMatches: 0,

  open: () => set({ isOpen: true, activeMatchOrdinal: 0, totalMatches: 0 }),
  close: () => set({ isOpen: false, activeMatchOrdinal: 0, totalMatches: 0 }),
  toggle: () =>
    set((state) =>
      state.isOpen
        ? { isOpen: false, activeMatchOrdinal: 0, totalMatches: 0 }
        : { isOpen: true, activeMatchOrdinal: 0, totalMatches: 0 },
    ),
  setResult: (ordinal: number, total: number) =>
    set({ activeMatchOrdinal: ordinal, totalMatches: total }),
  resetResult: () => set({ activeMatchOrdinal: 0, totalMatches: 0 }),
}));
