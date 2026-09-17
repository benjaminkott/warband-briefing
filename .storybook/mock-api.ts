import type { IpcResult, BriefingApi } from '../src/preload/index'
import { CONFIG, DATA_BUNDLE, SOURCES, SYNC_BUNDLE, UPDATE_STATE, storyIcon } from '../src/renderer/src/stories/fixtures'
import { WtGameIcon } from '../src/renderer/src/components/GameIcon'

/**
 * The preload bridge, as far as a story needs it. There is no main process
 * behind Storybook, so every call answers from the fixtures and every
 * subscription is a no-op; a link opens in a new tab instead of the system
 * browser.
 */
const ok = <T>(data: T): Promise<IpcResult<T>> => Promise.resolve({ ok: true, data })
const noop = (): (() => void) => () => undefined

const api: BriefingApi = {
  config: {
    get: () => ok(CONFIG),
    set: (patch) => ok({ ...CONFIG, ...patch })
  },
  wow: {
    choose: () => ok(CONFIG.wowPath)
  },
  data: {
    get: () => ok(DATA_BUNDLE),
    sync: () => ok(SYNC_BUNDLE)
  },
  sources: {
    list: () => ok(SOURCES),
    toggle: (id, enabled) => ok({ [id]: enabled })
  },
  chars: {
    hide: () => ok(CONFIG.hiddenKeys)
  },
  addon: {
    install: () => ok({ bundled: '4.0.0', installed: '4.0.0' })
  },
  update: {
    state: () => ok(UPDATE_STATE),
    check: () => ok(UPDATE_STATE),
    install: () => ok(true)
  },
  window: {
    minimize: () => ok(true),
    toggleMaximize: () => ok(true),
    close: () => ok(true),
    state: () => ok({ maximized: false })
  },
  shell: {
    openExternal: (url) => {
      window.open(url, '_blank', 'noopener')
      return ok(true)
    }
  },
  game: {
    state: () => ok({ running: null })
  },
  onGameState: noop,
  onConfigChanged: noop,
  onSyncStatus: noop,
  onUpdateChanged: noop,
  onWindowState: noop,
  onDataUpdated: noop,
  onAddonUpdated: noop
}

window.briefing = api

// No main process answers wt-icon://; the fixture names the icons instead.
WtGameIcon.resolve = storyIcon
