/**
 * Screen recording permission check and guidance for macOS
 */

import { systemPreferences, desktopCapturer, dialog, shell } from 'electron';

export type ScreenPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';

/**
 * Get current screen recording permission status
 */
export function getScreenPermissionStatus(): ScreenPermissionStatus {
  if (process.platform !== 'darwin') {
    return 'granted'; // Non-macOS platforms don't have TCC
  }

  const status = systemPreferences.getMediaAccessStatus('screen');
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'not-determined':
      return 'not-determined';
    case 'restricted':
      return 'restricted';
    default:
      return 'unknown';
  }
}

/**
 * Request screen recording permission.
 * - 'not-determined': triggers system permission prompt via desktopCapturer
 * - 'denied': shows dialog guiding user to System Settings
 * - 'granted': returns immediately
 */
export async function requestScreenPermission(): Promise<ScreenPermissionStatus> {
  const status = getScreenPermissionStatus();

  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'not-determined') {
    // Calling desktopCapturer.getSources triggers the system permission prompt
    try {
      await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 },
      });
    } catch {
      // Permission prompt was shown, user may have denied
    }

    // Re-check after prompt
    return getScreenPermissionStatus();
  }

  if (status === 'denied' || status === 'restricted') {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Screen Recording Permission Required',
      message: 'xToolbox needs screen recording permission to capture screenshots.',
      detail:
        'Please open System Settings > Privacy & Security > Screen Recording, ' +
        'then enable xToolbox. You may need to restart the app after granting permission.',
      buttons: ['Open System Settings', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
    }

    return status;
  }

  return status;
}
