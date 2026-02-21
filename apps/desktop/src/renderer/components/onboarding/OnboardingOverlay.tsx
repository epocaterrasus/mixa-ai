// Onboarding overlay — multi-step wizard shown on first launch

import { useEffect } from "react";
import { useOnboardingStore, type OnboardingStep } from "../../stores/onboarding";
import { WelcomeStep } from "./WelcomeStep";
import { AISetupStep } from "./AISetupStep";
import { ExploreStep } from "./ExploreStep";
import { CaptureStep } from "./CaptureStep";
import { ChatStep } from "./ChatStep";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
};

const cardStyle: React.CSSProperties = {
  width: "560px",
  maxHeight: "80vh",
  backgroundColor: "var(--mixa-bg-surface)",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderTop: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-base)",
};

const progressBarBg: React.CSSProperties = {
  height: "3px",
  backgroundColor: "var(--mixa-border-default)",
};

function StepContent({ step }: { step: OnboardingStep }): React.ReactElement {
  switch (step) {
    case "welcome":
      return <WelcomeStep />;
    case "ai-setup":
      return <AISetupStep />;
    case "explore":
      return <ExploreStep />;
    case "capture":
      return <CaptureStep />;
    case "chat":
      return <ChatStep />;
  }
}

function StepIndicator({ current, total }: { current: number; total: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? "20px" : "6px",
            height: "6px",
            borderRadius: "3px",
            backgroundColor: i === current
              ? "var(--mixa-accent)"
              : i < current
                ? "var(--mixa-text-muted)"
                : "var(--mixa-border-default)",
            transition: "all 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "opacity 0.15s",
};

export function OnboardingOverlay(): React.ReactElement | null {
  const { isOpen, isLoading, currentStepIndex, currentStep, totalSteps, initialize, nextStep, prevStep, skipOnboarding } =
    useOnboardingStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isLoading || !isOpen) {
    return null;
  }

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Welcome to Mixa">
      <div style={cardStyle}>
        {/* Progress bar */}
        <div style={progressBarBg}>
          <div
            style={{
              height: "3px",
              width: `${progress}%`,
              backgroundColor: "var(--mixa-accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Step content (scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
          <StepContent step={currentStep} />
        </div>

        {/* Footer with navigation */}
        <div style={footerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!isFirst && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  ...btnBase,
                  border: "1px solid var(--mixa-border-default)",
                  backgroundColor: "transparent",
                  color: "var(--mixa-text-secondary)",
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => void skipOnboarding()}
              style={{
                ...btnBase,
                border: "none",
                background: "none",
                color: "var(--mixa-text-muted)",
                padding: "8px 12px",
              }}
            >
              Skip
            </button>
          </div>

          <StepIndicator current={currentStepIndex} total={totalSteps} />

          <button
            type="button"
            onClick={nextStep}
            style={{
              ...btnBase,
              border: "1px solid var(--mixa-accent)",
              backgroundColor: "var(--mixa-accent)",
              color: "#fff",
            }}
          >
            {isLast ? "Get started" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
