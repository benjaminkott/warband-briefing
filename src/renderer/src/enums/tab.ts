/**
 * The views the top bar switches between, in the bar's order: the roster
 * first, as the app opens on it; the list beside it; then what the
 * warband holds - its gold, its bank, its renown. Ctrl with a digit
 * opens the tab at that position, so the order here is the one the player
 * counts.
 */
export enum Tab {
  Roster = 'roster',
  Tasks = 'tasks',
  Gold = 'gold',
  Bank = 'bank',
  Renown = 'renown',
  Settings = 'settings'
}

/** The tab `step` places along the bar, round the end: Ctrl+Tab from the last tab is the first. */
export function tabAfter(tab: Tab, step: number): Tab {
  const tabs = Object.values(Tab)
  const index = tabs.indexOf(tab)
  return tabs[(((index + step) % tabs.length) + tabs.length) % tabs.length]!
}
