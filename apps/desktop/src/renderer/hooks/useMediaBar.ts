import { useEffect, useRef } from "react";
import { useMediaBarStore } from "../stores/mediaBar";
import { useSettingsStore } from "../stores/settings";

/** Height of the media bar when visible (in pixels) */
const MEDIA_BAR_HEIGHT = 40;
/** Height of the collapsed media bar indicator (in pixels) */
const COLLAPSED_HEIGHT = 24;

/**
 * Hook that subscribes to media state updates from the main process
 * and syncs media bar height and position to the main process for BrowserView bounds.
 */
export function useMediaBar(): void {
  const updateMediaState = useMediaBarStore((s) => s.updateMediaState);
  const setPosition = useMediaBarStore((s) => s.setPosition);
  const meetSessions = useMediaBarStore((s) => s.meetSessions);
  const audioTabs = useMediaBarStore((s) => s.audioTabs);
  const isCollapsed = useMediaBarStore((s) => s.isCollapsed);
  const position = useMediaBarStore((s) => s.position);
  const prevHeight = useRef(0);
  const prevPosition = useRef(position);

  // Sync position from settings store when settings load
  const settingsPosition = useSettingsStore((s) => s.settings?.mediaBar.position);
  useEffect(() => {
    if (settingsPosition && settingsPosition !== position) {
      setPosition(settingsPosition);
    }
  }, [settingsPosition, setPosition, position]);

  // Subscribe to media state updates from main process
  useEffect(() => {
    const unsub = window.electronAPI.media.onStateChanged((data) => {
      updateMediaState(data.meetSessions, data.audioTabs);
    });
    return unsub;
  }, [updateMediaState]);

  // Sync media bar height to main process for BrowserView bounds
  const hasContent = meetSessions.length > 0 || audioTabs.length > 0;
  let currentHeight = 0;
  if (hasContent) {
    currentHeight = isCollapsed ? COLLAPSED_HEIGHT : MEDIA_BAR_HEIGHT;
  }

  useEffect(() => {
    if (prevHeight.current !== currentHeight) {
      prevHeight.current = currentHeight;
      void window.electronAPI.media.setBarHeight(currentHeight);
    }
  }, [currentHeight]);

  // Sync position to main process when it changes
  useEffect(() => {
    if (prevPosition.current !== position) {
      prevPosition.current = position;
      void window.electronAPI.media.setBarPosition(position);
    }
  }, [position]);
}
