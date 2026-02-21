import { create } from "zustand";

interface CaptureToast {
  id: string;
  type: "success" | "error" | "duplicate";
  title: string;
  message: string;
  timestamp: number;
}

interface CaptureStore {
  isCapturing: boolean;
  toasts: CaptureToast[];

  setCapturing: (capturing: boolean) => void;
  addToast: (toast: Omit<CaptureToast, "id" | "timestamp">) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useCaptureStore = create<CaptureStore>((set) => ({
  isCapturing: false,
  toasts: [],

  setCapturing: (capturing: boolean) => set({ isCapturing: capturing }),

  addToast: (toast) => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    const newToast: CaptureToast = { ...toast, id, timestamp: Date.now() };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
