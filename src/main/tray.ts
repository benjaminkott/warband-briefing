/**
 * The icon in the notification area, shown while the close button keeps
 * the app in the background: the one way back to a hidden window, and the
 * one way to end the app then.
 */

import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import type { Translator } from '../shared/i18n'

export interface TrayActions {
  open(): void
  quit(): void
}

export class AppTray {
  private tray: Tray | null = null

  constructor(
    private readonly actions: TrayActions,
    /** The icon of the dev build; the packaged build carries its own. */
    private readonly devIcon: string
  ) {}

  /** Shows or removes the icon; the menu takes the words of the translator given. */
  async configure(enabled: boolean, tr: Translator): Promise<void> {
    if (!enabled) {
      this.tray?.destroy()
      this.tray = null
      return
    }
    if (!this.tray) {
      const icon = await this.icon()
      // A concurrent call can have made one while the icon loaded.
      if (this.tray) return
      this.tray = new Tray(icon)
      this.tray.setToolTip('Warband Briefing')
      this.tray.on('click', () => this.actions.open())
    }
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: tr.t('tray.open'), click: () => this.actions.open() },
        { type: 'separator' },
        { label: tr.t('tray.quit'), click: () => this.actions.quit() }
      ])
    )
  }

  /** The executable's own icon: the packaged build ships no image file. */
  private icon(): Promise<NativeImage> {
    if (!app.isPackaged) return Promise.resolve(nativeImage.createFromPath(this.devIcon))
    return app.getFileIcon(process.execPath, { size: 'small' })
  }
}
