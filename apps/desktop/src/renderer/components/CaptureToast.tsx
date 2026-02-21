import { useCaptureStore } from "../stores/capture";

const containerStyles: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  zIndex: 10000,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  pointerEvents: "none",
};

const toastStyles: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  fontSize: 13,
  maxWidth: 320,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  pointerEvents: "auto",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  animation: "toastSlideIn 0.2s ease-out",
};

function getToastColors(type: "success" | "error" | "duplicate"): React.CSSProperties {
  switch (type) {
    case "success":
      return {
        backgroundColor: "var(--mixa-bg-elevated, #1a1a2e)",
        border: "1px solid var(--mixa-accent, #4f46e5)",
        color: "var(--mixa-text-primary, #e2e8f0)",
      };
    case "duplicate":
      return {
        backgroundColor: "var(--mixa-bg-elevated, #1a1a2e)",
        border: "1px solid #f59e0b",
        color: "var(--mixa-text-primary, #e2e8f0)",
      };
    case "error":
      return {
        backgroundColor: "var(--mixa-bg-elevated, #1a1a2e)",
        border: "1px solid #ef4444",
        color: "var(--mixa-text-primary, #e2e8f0)",
      };
  }
}

function getIcon(type: "success" | "error" | "duplicate"): string {
  switch (type) {
    case "success":
      return "\u2713";
    case "duplicate":
      return "\u21BB";
    case "error":
      return "\u2717";
  }
}

export function CaptureToast(): React.ReactElement | null {
  const toasts = useCaptureStore((s) => s.toasts);
  const removeToast = useCaptureStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={containerStyles}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{ ...toastStyles, ...getToastColors(toast.type) }}
            onClick={() => removeToast(toast.id)}
            role="alert"
          >
            <span style={{ fontSize: 16, lineHeight: "20px", flexShrink: 0 }}>
              {getIcon(toast.type)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{toast.title}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--mixa-text-muted, #94a3b8)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {toast.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
