/**
 * The icon in the notification area, shown while the app runs: it says the
 * app is there when the window is hidden, brings the window back, and its
 * menu is the one way to end the app then.
 */

import { Menu, nativeImage, Tray } from 'electron'
import type { Translator } from '../shared/i18n'

export interface TrayActions {
  open(): void
  quit(): void
}

export class AppTray {
  private tray: Tray | null = null

  constructor(
    private readonly actions: TrayActions,
    /** The ico file with the sizes the notification area asks for. */
    private readonly icon: string
  ) {}

  /** Shows the icon; the menu takes the words of the translator given. */
  configure(tr: Translator): void {
    if (!this.tray) {
      this.tray = new Tray(nativeImage.createFromPath(this.icon))
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
}
