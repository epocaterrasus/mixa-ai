import { describe, it, expect, beforeEach, vi } from "vitest";
import type { UserSettings } from "@mixa-ai/types";
import { useOnboardingStore } from "./onboarding";

// Mock the trpc client
vi.mock("../trpc", () => ({
  trpc: {
    settings: {
      get: {
        query: vi.fn().mockResolvedValue({ onboardingCompleted: false }),
      },
      update: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  },
}));

function resetStore(): void {
  useOnboardingStore.setState({
    isOpen: false,
    currentStepIndex: 0,
    currentStep: "welcome",
    totalSteps: 5,
    isLoading: true,
  });
}

describe("Onboarding Store", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with onboarding closed and loading", () => {
      const state = useOnboardingStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.currentStepIndex).toBe(0);
      expect(state.currentStep).toBe("welcome");
      expect(state.totalSteps).toBe(5);
    });
  });

  describe("initialize", () => {
    it("opens onboarding when onboardingCompleted is false", async () => {
      const { trpc } = await import("../trpc");
      vi.mocked(trpc.settings.get.query).mockResolvedValueOnce({
        onboardingCompleted: false,
      } as unknown as UserSettings);

      await useOnboardingStore.getState().initialize();

      const state = useOnboardingStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.currentStepIndex).toBe(0);
      expect(state.currentStep).toBe("welcome");
    });

    it("keeps onboarding closed when onboardingCompleted is true", async () => {
      const { trpc } = await import("../trpc");
      vi.mocked(trpc.settings.get.query).mockResolvedValueOnce({
        onboardingCompleted: true,
      } as unknown as UserSettings);

      await useOnboardingStore.getState().initialize();

      const state = useOnboardingStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("does not block app when settings fail to load", async () => {
      const { trpc } = await import("../trpc");
      vi.mocked(trpc.settings.get.query).mockRejectedValueOnce(
        new Error("Connection refused"),
      );

      await useOnboardingStore.getState().initialize();

      const state = useOnboardingStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("step navigation", () => {
    beforeEach(() => {
      useOnboardingStore.setState({
        isOpen: true,
        isLoading: false,
        currentStepIndex: 0,
        currentStep: "welcome",
      });
    });

    it("advances to the next step", () => {
      useOnboardingStore.getState().nextStep();

      const state = useOnboardingStore.getState();
      expect(state.currentStepIndex).toBe(1);
      expect(state.currentStep).toBe("ai-setup");
    });

    it("advances through all steps in order", () => {
      const expectedSteps = ["ai-setup", "explore", "capture", "chat"] as const;

      for (const expected of expectedSteps) {
        useOnboardingStore.getState().nextStep();
        expect(useOnboardingStore.getState().currentStep).toBe(expected);
      }
    });

    it("goes back to the previous step", () => {
      useOnboardingStore.setState({ currentStepIndex: 2, currentStep: "explore" });

      useOnboardingStore.getState().prevStep();

      const state = useOnboardingStore.getState();
      expect(state.currentStepIndex).toBe(1);
      expect(state.currentStep).toBe("ai-setup");
    });

    it("does not go below step 0", () => {
      useOnboardingStore.getState().prevStep();

      const state = useOnboardingStore.getState();
      expect(state.currentStepIndex).toBe(0);
      expect(state.currentStep).toBe("welcome");
    });

    it("completes onboarding when advancing past the last step", async () => {
      const { trpc } = await import("../trpc");

      useOnboardingStore.setState({ currentStepIndex: 4, currentStep: "chat" });
      useOnboardingStore.getState().nextStep();

      // Wait for async completeOnboarding
      await vi.waitFor(() => {
        expect(useOnboardingStore.getState().isOpen).toBe(false);
      });

      expect(trpc.settings.update.mutate).toHaveBeenCalledWith({
        onboardingCompleted: true,
      });
    });
  });

  describe("skipOnboarding", () => {
    it("closes the overlay and persists completion", async () => {
      const { trpc } = await import("../trpc");

      useOnboardingStore.setState({ isOpen: true, isLoading: false });
      await useOnboardingStore.getState().skipOnboarding();

      expect(useOnboardingStore.getState().isOpen).toBe(false);
      expect(trpc.settings.update.mutate).toHaveBeenCalledWith({
        onboardingCompleted: true,
      });
    });

    it("closes overlay even when persist fails", async () => {
      const { trpc } = await import("../trpc");
      vi.mocked(trpc.settings.update.mutate).mockRejectedValueOnce(
        new Error("Write failed"),
      );

      useOnboardingStore.setState({ isOpen: true, isLoading: false });
      await useOnboardingStore.getState().skipOnboarding();

      expect(useOnboardingStore.getState().isOpen).toBe(false);
    });
  });

  describe("completeOnboarding", () => {
    it("closes the overlay and persists", async () => {
      const { trpc } = await import("../trpc");

      useOnboardingStore.setState({ isOpen: true, isLoading: false });
      await useOnboardingStore.getState().completeOnboarding();

      expect(useOnboardingStore.getState().isOpen).toBe(false);
      expect(trpc.settings.update.mutate).toHaveBeenCalledWith({
        onboardingCompleted: true,
      });
    });
  });
});
