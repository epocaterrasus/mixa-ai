import type { MeetSessionInfo, AudioTabInfo, MeetControlAction, MediaBarPosition } from "@mixa-ai/types";
import { Icon } from "@mixa-ai/ui";
import { useMediaBarStore } from "../stores/mediaBar";
import { useTabStore } from "../stores/tabs";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function getContainerBorder(position: MediaBarPosition): React.CSSProperties {
  if (position === "top") {
    return { borderBottom: "1px solid var(--mixa-border-subtle)" };
  }
  return { borderTop: "1px solid var(--mixa-border-subtle)" };
}

const styles = {
  containerBase: {
    display: "flex",
    alignItems: "center",
    height: "40px",
    padding: "0 12px",
    backgroundColor: "var(--mixa-bg-elevated)",
    gap: "12px",
    fontSize: "13px",
    color: "var(--mixa-text-primary)",
    flexShrink: 0,
  } as React.CSSProperties,
  meetSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  meetTitle: {
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  } as React.CSSProperties,
  meetMeta: {
    color: "var(--mixa-text-muted)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
  } as React.CSSProperties,
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  } as React.CSSProperties,
  controlBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-primary)",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
  controlBtnMuted: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "rgba(184, 112, 112, 0.2)",
    color: "var(--mixa-accent-red)",
    cursor: "pointer",
    padding: 0,
  } as React.CSSProperties,
  leaveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "28px",
    padding: "0 12px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "var(--mixa-accent-red)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  } as React.CSSProperties,
  divider: {
    width: "1px",
    height: "20px",
    backgroundColor: "var(--mixa-border-subtle)",
    flexShrink: 0,
  } as React.CSSProperties,
  audioSection: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  } as React.CSSProperties,
  audioTab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    borderRadius: "6px",
    backgroundColor: "var(--mixa-bg-surface)",
    cursor: "pointer",
    border: "none",
    color: "var(--mixa-text-primary)",
    fontSize: "12px",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  collapseBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--mixa-text-muted)",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  } as React.CSSProperties,
} as const;

function sendMeetControl(tabId: string, action: MeetControlAction): void {
  void window.electronAPI.media.executeControl(tabId, action);
}

function MeetControls({ session }: { session: MeetSessionInfo }): React.ReactElement {
  return (
    <div style={styles.controls}>
      <button
        type="button"
        style={session.isMuted ? styles.controlBtnMuted : styles.controlBtn}
        onClick={() => sendMeetControl(session.tabId, "toggle-mute")}
        title={session.isMuted ? "Unmute microphone" : "Mute microphone"}
        aria-label={session.isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        <Icon name={session.isMuted ? "micOff" : "mic"} size={16} />
      </button>
      <button
        type="button"
        style={session.isCameraOff ? styles.controlBtnMuted : styles.controlBtn}
        onClick={() => sendMeetControl(session.tabId, "toggle-camera")}
        title={session.isCameraOff ? "Turn on camera" : "Turn off camera"}
        aria-label={session.isCameraOff ? "Turn on camera" : "Turn off camera"}
      >
        <Icon name={session.isCameraOff ? "cameraOff" : "camera"} size={16} />
      </button>
      <button
        type="button"
        style={styles.leaveBtn}
        onClick={() => sendMeetControl(session.tabId, "leave-meeting")}
        title="Leave meeting"
        aria-label="Leave meeting"
      >
        <Icon name="phoneOff" size={14} />
        <span style={{ marginLeft: "4px" }}>Leave</span>
      </button>
    </div>
  );
}

function AudioTabChip({ tab }: { tab: AudioTabInfo }): React.ReactElement {
  const activateTab = useTabStore((s) => s.activateTab);

  return (
    <button
      type="button"
      style={styles.audioTab}
      onClick={() => activateTab(tab.tabId)}
      title={tab.title}
      aria-label={`Switch to ${tab.title}`}
    >
      <Icon name="volume" size={12} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tab.title}
      </span>
    </button>
  );
}

export function MediaBar(): React.ReactElement | null {
  const meetSessions = useMediaBarStore((s) => s.meetSessions);
  const audioTabs = useMediaBarStore((s) => s.audioTabs);
  const isCollapsed = useMediaBarStore((s) => s.isCollapsed);
  const position = useMediaBarStore((s) => s.position);
  const toggle = useMediaBarStore((s) => s.toggle);

  const hasContent = meetSessions.length > 0 || audioTabs.length > 0;

  if (!hasContent) return null;

  const containerStyle: React.CSSProperties = {
    ...styles.containerBase,
    ...getContainerBorder(position),
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          ...containerStyle,
          height: "24px",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
        aria-label="Expand media bar"
      >
        <span style={{ fontSize: "11px", color: "var(--mixa-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
          {meetSessions.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Icon name="camera" size={12} />
              {meetSessions.length} meeting{meetSessions.length > 1 ? "s" : ""}
            </span>
          )}
          {audioTabs.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Icon name="volume" size={12} />
              {audioTabs.length} playing
            </span>
          )}
          <Icon name={position === "top" ? "down" : "up"} size={12} />
        </span>
      </div>
    );
  }

  const meetTabIds = new Set(meetSessions.map((s) => s.tabId));
  const nonMeetAudioTabs = audioTabs.filter((t) => !meetTabIds.has(t.tabId));

  return (
    <div style={containerStyle} role="region" aria-label="Media bar">
      {meetSessions.map((session) => (
        <div key={session.tabId} style={styles.meetSection}>
          <Icon name="camera" size={16} />
          <span style={styles.meetTitle}>{session.meetingName}</span>
          <div style={styles.meetMeta}>
            {session.durationSeconds > 0 && (
              <span>{formatDuration(session.durationSeconds)}</span>
            )}
            {session.participantCount > 0 && (
              <span>
                {session.participantCount} {session.participantCount === 1 ? "person" : "people"}
              </span>
            )}
          </div>
          <MeetControls session={session} />
        </div>
      ))}

      {meetSessions.length > 0 && nonMeetAudioTabs.length > 0 && (
        <div style={styles.divider} />
      )}

      {nonMeetAudioTabs.length > 0 && (
        <div style={styles.audioSection}>
          {nonMeetAudioTabs.map((tab) => (
            <AudioTabChip key={tab.tabId} tab={tab} />
          ))}
        </div>
      )}

      <button
        type="button"
        style={styles.collapseBtn}
        onClick={toggle}
        title="Collapse media bar"
        aria-label="Collapse media bar"
      >
        <Icon name={position === "top" ? "up" : "down"} size={14} />
      </button>
    </div>
  );
}
