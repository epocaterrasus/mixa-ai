// JavaScript snippets executed inside Google Meet webContents to extract data and perform actions.
// These must be plain strings (no Node/Electron APIs) since they run in the renderer context.

/** Extract meeting info from the Google Meet page DOM */
export const MEET_EXTRACT_INFO_SCRIPT = `
(function() {
  try {
    // Meeting name: from the data-meeting-title attribute or the toolbar text
    const meetingNameEl = document.querySelector('[data-meeting-title]');
    const meetingName = meetingNameEl
      ? meetingNameEl.getAttribute('data-meeting-title') || ''
      : (document.querySelector('[data-unresolved-meeting-id]')?.getAttribute('data-unresolved-meeting-id') || '');

    // Participant count: from the participant button badge or aria label
    const participantBtn = document.querySelector('[data-panel-id="2"]') ||
      document.querySelector('button[aria-label*="participant" i]') ||
      document.querySelector('button[aria-label*="people" i]');
    let participantCount = 0;
    if (participantBtn) {
      const badge = participantBtn.querySelector('.gV3q8b') ||
        participantBtn.querySelector('[class*="count"]');
      if (badge && badge.textContent) {
        participantCount = parseInt(badge.textContent.trim(), 10) || 0;
      }
      if (participantCount === 0) {
        // Try extracting from aria-label like "Show everyone (3)"
        const ariaLabel = participantBtn.getAttribute('aria-label') || '';
        const match = ariaLabel.match(/\\((\\d+)\\)/);
        if (match) {
          participantCount = parseInt(match[1], 10) || 0;
        }
      }
    }

    // Mute state: check the mic button's data-is-muted attribute or aria-label
    const micBtn = document.querySelector('[data-is-muted]') ||
      document.querySelector('button[aria-label*="microphone" i]') ||
      document.querySelector('button[aria-label*="mic" i]');
    let isMuted = false;
    if (micBtn) {
      const dataMuted = micBtn.getAttribute('data-is-muted');
      if (dataMuted !== null) {
        isMuted = dataMuted === 'true';
      } else {
        const ariaLabel = (micBtn.getAttribute('aria-label') || '').toLowerCase();
        isMuted = ariaLabel.includes('unmute') || ariaLabel.includes('turn on microphone');
      }
    }

    // Camera state: check the camera button
    const camBtn = document.querySelector('button[aria-label*="camera" i]') ||
      document.querySelector('button[aria-label*="video" i]');
    let isCameraOff = false;
    if (camBtn) {
      const ariaLabel = (camBtn.getAttribute('aria-label') || '').toLowerCase();
      isCameraOff = ariaLabel.includes('turn on') || ariaLabel.includes('start video');
    }

    return JSON.stringify({
      meetingName: meetingName || 'Meeting',
      participantCount: participantCount,
      isMuted: isMuted,
      isCameraOff: isCameraOff,
    });
  } catch (e) {
    return JSON.stringify({
      meetingName: 'Meeting',
      participantCount: 0,
      isMuted: false,
      isCameraOff: false,
    });
  }
})();
`;

/** Toggle mute on the Google Meet page */
export const MEET_TOGGLE_MUTE_SCRIPT = `
(function() {
  const micBtn = document.querySelector('[data-is-muted]') ||
    document.querySelector('button[aria-label*="microphone" i]') ||
    document.querySelector('button[aria-label*="mic" i]');
  if (micBtn) micBtn.click();
  return true;
})();
`;

/** Toggle camera on the Google Meet page */
export const MEET_TOGGLE_CAMERA_SCRIPT = `
(function() {
  const camBtn = document.querySelector('button[aria-label*="camera" i]') ||
    document.querySelector('button[aria-label*="video" i]');
  if (camBtn) camBtn.click();
  return true;
})();
`;

/** Leave the Google Meet meeting */
export const MEET_LEAVE_SCRIPT = `
(function() {
  const leaveBtn = document.querySelector('button[aria-label*="leave" i]') ||
    document.querySelector('button[aria-label*="hang up" i]') ||
    document.querySelector('[data-tooltip*="Leave" i]');
  if (leaveBtn) leaveBtn.click();
  return true;
})();
`;
