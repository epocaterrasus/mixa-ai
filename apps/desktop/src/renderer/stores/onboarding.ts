// Onboarding store — manages the new-user onboarding wizard state

import { create } from "zustand";
import { trpc } from "../trpc";

export type OnboardingStep = "welcome" | "ai-setup" | "explore" | "capture" | "chat";

const STEPS: OnboardingStep[] = ["welcome", "ai-setup", "explore", "capture", "chat"];

interface OnboardingState {
  /** Whether onboarding is visible */
  isOpen: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Current step identifier */
  currentStep: OnboardingStep;
  /** Total number of steps */
  totalSteps: number;
  /** Whether loading initial state */
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isOpen: false,
  currentStepIndex: 0,
  currentStep: "welcome",
  totalSteps: STEPS.length,
  isLoading: true,

  initialize: async () => {
    try {
      const settings = await trpc.settings.get.query();
      const shouldShow = !settings.onboardingCompleted;
      set({
        isOpen: shouldShow,
        isLoading: false,
        currentStepIndex: 0,
        currentStep: "welcome",
      });
    } catch {
      // If settings can't load, don't block the app
      set({ isOpen: false, isLoading: false });
    }
  },

  nextStep: () => {
    const { currentStepIndex, totalSteps } = get();
    const next = currentStepIndex + 1;
    if (next >= totalSteps) {
      get().completeOnboarding();
      return;
    }
    set({
      currentStepIndex: next,
      currentStep: STEPS[next],
    });
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex <= 0) return;
    const prev = currentStepIndex - 1;
    set({
      currentStepIndex: prev,
      currentStep: STEPS[prev],
    });
  },

  skipOnboarding: async () => {
    set({ isOpen: false });
    try {
      await trpc.settings.update.mutate({ onboardingCompleted: true });
    } catch {
      // Best-effort persist
    }
  },

  completeOnboarding: async () => {
    set({ isOpen: false });
    try {
      await trpc.settings.update.mutate({ onboardingCompleted: true });
    } catch {
      // Best-effort persist
    }
  },
}));
