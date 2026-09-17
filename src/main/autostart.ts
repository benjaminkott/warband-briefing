/**
 * The login item: the app starts when the user logs in to the computer.
 * The setting is the wish, the OS holds the registration. Every start and
 * every change of the setting writes the registration again, so the two
 * cannot drift apart - an update that moves the executable included.
 */

import { app } from 'electron'

export function applyAutoStart(enabled: boolean): void {
  // Unpackaged, the executable is Electron itself: a login item for it
  // would start a bare shell, not the app.
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath })
}
