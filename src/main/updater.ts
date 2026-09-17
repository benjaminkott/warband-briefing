/**
 * Automatic updates via electron-updater.
 *
 * The update feed is configured at runtime rather than baked into the build, so
 * the same installer works whether releases live on GitHub or on any static web
 * host. Checking only happens when a source is configured and the app actually
 * runs installed - an unpackaged dev build has no update metadata.
 */

import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { Translator } from '../shared/i18n'
import type { UpdateSource, UpdateState } from '../shared/types'
import { UpdateSourceKind } from '../shared/enums/updateSourceKind'

const { autoUpdater } = electronUpdater

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
/** Wait a little after launch so the first check never competes with startup. */
const FIRST_CHECK_DELAY_MS = 12_000

export function parseGithubRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, '')
  // Accepts "owner/repo" as well as a full github.com URL.
  const match = /^(?:https?:\/\/(?:www\.)?github\.com\/)?([\w.-]+)\/([\w.-]+)\/?$/.exec(trimmed)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

export function describeSource(tr: Translator, source: UpdateSource | null): string {
  if (!source) return tr.t('update.sourceNotConfigured')
  if (source.kind === UpdateSourceKind.Github) return tr.t('update.sourceGithub', { repo: source.repo })
  return tr.t('update.sourceGeneric', { url: source.url })
}

export class Updater {
  private state: UpdateState
  private timer: NodeJS.Timeout | null = null
  private source: UpdateSource | null = null
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
      error: null,
      sourceLabel: this.translator().t('update.sourceNotConfigured')
    }

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

  /** Applies the configured feed and (re)arms the periodic check. */
  configure(source: UpdateSource | null, enabled: boolean): void {
    this.source = source
    this.enabled = enabled
    this.patch({ sourceLabel: describeSource(this.translator(), source), error: null })

    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (!source || !enabled || !app.isPackaged) return

    try {
      if (source.kind === UpdateSourceKind.Github) {
        const parsed = parseGithubRepo(source.repo)
        if (!parsed) throw new Error(this.translator().t('error.badRepo', { repo: source.repo }))
        autoUpdater.setFeedURL({ provider: 'github', owner: parsed.owner, repo: parsed.repo })
      } else {
        autoUpdater.setFeedURL({ provider: 'generic', url: source.url })
      }
    } catch (e) {
      this.patch({ error: (e as Error).message })
      return
    }

    this.timer = setInterval(() => void this.check(true), CHECK_INTERVAL_MS)
  }

  /** Starts the first automatic check shortly after launch. */
  start(): void {
    setTimeout(() => void this.check(true), FIRST_CHECK_DELAY_MS)
  }

  /**
   * @param automatic silent checks skip the "nothing configured" complaints that
   *                  a manual click should surface.
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
    if (!this.source) {
      if (!automatic) this.patch({ error: this.translator().t('error.noUpdateSource') })
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
