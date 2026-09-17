/**
 * Wowhead's tooltip script, the one Wowhead offers every site to embed: it
 * hangs a tooltip with the item's stats on every link to Wowhead, and
 * reads `data-wowhead="item=…&bonus=…"` for the item as it is. The app
 * loads it when the setting is on and asks it to look again after the
 * views have drawn new links.
 *
 * It is the one script in the renderer that is not the app's own: it runs
 * in the page, sees the DOM, and fetches from Wowhead's hosts when the
 * pointer is on a link. Node is out of its reach (context isolation), and
 * the bridge takes only what the preload names. Off, the script is not
 * loaded, and a link says so to it (`data-disable-wowhead-tooltip`), for
 * the case that it was loaded before the switch.
 */

/** Wowhead's script, from its own host; the CSP names the host. */
const SCRIPT_URL = 'https://wow.zamimg.com/js/tooltips.js'

declare global {
  interface Window {
    whTooltips?: { colorLinks?: boolean; iconizeLinks?: boolean; renameLinks?: boolean; iconSize?: string }
    $WowheadPower?: { refreshLinks?: () => void }
  }
}

let enabled = false
let loaded = false
let refreshPending = false

/** Whether links take Wowhead's tooltip now; an element reads it when it draws. */
export function wowheadTooltipsEnabled(): boolean {
  return enabled
}

/** Follows the setting: loads the script the first time it is on. */
export function applyWowheadTooltips(on: boolean): void {
  enabled = on
  if (!on || loaded) return
  loaded = true
  // The links stay the app's: no colour, no icon, no renaming by the script.
  window.whTooltips = { colorLinks: false, iconizeLinks: false, renameLinks: false }
  const script = document.createElement('script')
  script.src = SCRIPT_URL
  script.async = true
  document.head.append(script)
}

/**
 * Asks the script to look at the links again, once per frame however
 * many elements ask: the script scans the document, and a view draws
 * hundreds of tiles in one update.
 */
export function refreshWowheadLinks(): void {
  if (!enabled || refreshPending) return
  refreshPending = true
  requestAnimationFrame(() => {
    refreshPending = false
    window.$WowheadPower?.refreshLinks?.()
  })
}
