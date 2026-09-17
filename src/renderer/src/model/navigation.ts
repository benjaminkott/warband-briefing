import { Tab } from '../enums/tab'

/**
 * Where the shell stands: a tab, the character whose page is open over
 * it, and what the player looks for there. The page closes when the tab
 * changes, so the two are one place. The query is the place's, not a
 * place of its own: what is typed on a tab stays with that tab, a step
 * back brings it back, and a new place starts with none.
 */
export interface Place {
  tab: Tab
  character: string | null
  query: string
}

/**
 * The places the user has been, in order, and where in them the shell
 * stands now. A step back or forward moves the index; a new visit cuts what
 * lies ahead, as a browser does.
 */
export interface Trail {
  places: Place[]
  index: number
}

// The board is the widest view of the account: the week in figures, every
// character in one glance. So the roster is what opens; the list is one
// click away.
export const START: Trail = { places: [{ tab: Tab.Roster, character: null, query: '' }], index: 0 }

/** Enough for a session; older places fall off the start. */
export const MAX_PLACES = 100

export function here(trail: Trail): Place {
  return trail.places[trail.index]
}

export function samePlace(a: Place, b: Place): boolean {
  return a.tab === b.tab && a.character === b.character
}

/**
 * A visit to the place the shell already stands in is not a step; it
 * only takes the visit's query, as a search hit that opens the page the
 * player is on does.
 */
export function visit(trail: Trail, place: Place): Trail {
  if (samePlace(here(trail), place)) return lookFor(trail, place.query)
  const places = [...trail.places.slice(0, trail.index + 1), place].slice(-MAX_PLACES)
  return { places, index: places.length - 1 }
}

/** What the player types into the search: the place's query, changed where the shell stands. */
export function lookFor(trail: Trail, query: string): Trail {
  const current = here(trail)
  if (current.query === query) return trail
  const places = [...trail.places]
  places[trail.index] = { ...current, query }
  return { ...trail, places }
}

/**
 * The tab open before the one the shell stands in, or null when there was
 * none: Ctrl+Tab flips to it, and flips back, as Alt+Tab does with windows.
 * The trail is read backwards so a page opened over the tab does not count
 * as a change of tab.
 */
export function lastTab(trail: Trail): Tab | null {
  const current = here(trail).tab
  for (let i = trail.index - 1; i >= 0; i--) {
    const tab = trail.places[i]!.tab
    if (tab !== current) return tab
  }
  return null
}

export function canBack(trail: Trail): boolean {
  return trail.index > 0
}

export function canForward(trail: Trail): boolean {
  return trail.index < trail.places.length - 1
}

export function back(trail: Trail): Trail {
  return canBack(trail) ? { ...trail, index: trail.index - 1 } : trail
}

export function forward(trail: Trail): Trail {
  return canForward(trail) ? { ...trail, index: trail.index + 1 } : trail
}
