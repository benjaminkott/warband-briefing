/**
 * Automatic updates via electron-updater.
 *
 * The feed is the releases of the repository (`shared/repository.ts`), set at
 * runtime so a dev build and a packaged one read the same place. Checking
 * only happens when the app runs installed - an unpackaged dev build has no
 * update metadata.
 */

import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { Translator } from '../shared/i18n'
import type { UpdateState } from '../shared/types'
import { DAY_MS } from '../shared/time'
import { GITHUB_REPO } from '../shared/repository'

const { autoUpdater } = electronUpdater

const CHECK_INTERVAL_MS = DAY_MS
/** Wait a little after launch so the first check never competes with startup. */
const FIRST_CHECK_DELAY_MS = 12_000

export class Updater {
  private state: UpdateState
  private timer: NodeJS.Timeout | null = null
  private enabled = true

  constructor(
    private readonly onChange: (state: UpdateState) => void,
    private readonly translator: () => Translator
  ) {
    this.state = {
      supported: app.isPackaged,
      currentVersion: app.getVersion(),
      checking: false,
      available: false,
      latestVersion: null,
      releaseNotes: null,
      downloading: false,
      percent: 0,
      downloaded: false,
      lastCheckedAt: null,
      error: null
    }

    const [owner, repo] = GITHUB_REPO.split('/')
    autoUpdater.setFeedURL({ provider: 'github', owner, repo })

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    // Errors are surfaced in the UI instead of as a native dialog.
    autoUpdater.on('error', (error) => {
      this.patch({ checking: false, downloading: false, error: error.message })
    })
    autoUpdater.on('checking-for-update', () => this.patch({ checking: true, error: null }))
    autoUpdater.on('update-not-available', () => this.patch({ checking: false, available: false, lastCheckedAt: Date.now() }))
    autoUpdater.on('update-available', (info) =>
      this.patch({
        checking: false,
        available: true,
        latestVersion: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
        lastCheckedAt: Date.now()
      })
    )
    autoUpdater.on('download-progress', (progress) => this.patch({ downloading: true, percent: Math.round(progress.percent) }))
    autoUpdater.on('update-downloaded', (info) =>
      this.patch({ downloading: false, downloaded: true, percent: 100, latestVersion: info.version })
    )
  }

  getState(): UpdateState {
    return this.state
  }

  private patch(patch: Partial<UpdateState>): void {
    this.state = { ...this.state, ...patch }
    this.onChange(this.state)
  }

  /** Arms or disarms the periodic check. */
  configure(enabled: boolean): void {
    this.enabled = enabled
    this.patch({ error: null })

    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (!enabled || !app.isPackaged) return

    this.timer = setInterval(() => void this.check(true), CHECK_INTERVAL_MS)
  }

  /** Starts the first automatic check shortly after launch. */
  start(): void {
    setTimeout(() => void this.check(true), FIRST_CHECK_DELAY_MS)
  }

  /**
   * @param automatic a silent check skips the complaints a manual click
   *                  must show: a dev build, the switch off.
   */
  async check(automatic = false): Promise<UpdateState> {
    if (!app.isPackaged) {
      if (!automatic) {
        this.patch({ error: this.translator().t('error.devNoUpdates') })
      }
      return this.state
    }
    if (!this.enabled) {
      if (!automatic) this.patch({ error: this.translator().t('error.autoUpdateOff') })
      return this.state
    }
    // A downloaded update is waiting for a restart; checking again would only
    // re-download the same file.
    if (this.state.downloaded) return this.state

    try {
      await autoUpdater.checkForUpdates()
    } catch (e) {
      this.patch({ checking: false, error: (e as Error).message, lastCheckedAt: Date.now() })
    }
    return this.state
  }

  /** Quits and runs the downloaded installer. */
  installNow(): void {
    if (!this.state.downloaded) throw new Error(this.translator().t('error.noUpdateDownloaded'))
    // isSilent = false so the NSIS installer shows its progress, then relaunch.
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
