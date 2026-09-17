/**
 * A tip drawn as the game draws it: the lines of an item's tooltip, as the
 * companion registered them off the client, under the pointer on the item
 * in the app. The lines come with the item (`BagItem.tooltip`,
 * `GearItem.tooltip`); this works out what the tip shows of them, without
 * a DOM, so `wt-game-tip` only draws it.
 */

import type { TooltipLine } from '../../../shared/types'
import type { Translator } from '../../../shared/i18n'

export interface GameTip {
  /** The client's lines, the trailing blanks off. */
  lines: TooltipLine[]
  /** A plain text under the lines: what the link on the item does. */
  note: string | null
}

/**
 * The tip of an item that is a link to its page. Null without lines: the
 * link then keeps its own tip, which says where the click leads. With
 * lines the link's tip goes quiet and the note says it instead, so the
 * item has one tip, not two.
 */
export function itemTip(tr: Translator, lines: TooltipLine[] | undefined): GameTip | null {
  if (!lines || lines.length === 0) return null
  let end = lines.length
  while (end > 0 && !lines[end - 1]!.left && !lines[end - 1]!.right) end -= 1
  if (end === 0) return null
  return { lines: lines.slice(0, end), note: tr.t('card.openOn', { site: 'Wowhead' }) }
}

/** The CSS colour of a line's text, or none for the tip's own. */
export function lineColor(hex: string | null): string | null {
  return hex ? `#${hex}` : null
}
