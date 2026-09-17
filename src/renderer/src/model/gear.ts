/**
 * The gear check: what on a character is still worth fixing before the next
 * key. Not a score - a short list of slots, in the words a player uses.
 *
 * Only the companion reads the gear, off the client: the enchant, the gems,
 * the sockets and the item level. Without it a character has no gear, and
 * the check is silent rather than wrong.
 */

import type { CharacterSnapshot, GearItem } from '../../../shared/types'
import type { TranslationKey, Translator } from '../../../shared/i18n'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../shared/display'
import { wantsChore } from '../../../shared/skips'
import { GearIssueKind } from '../enums/gearIssueKind'
import { Severity } from '../enums/severity'
import type { ListTip } from './listTip'
import type { IconName } from '../components/Icon'

/**
 * Slots that take an enchant, for a record no merge has marked: chest, legs,
 * feet, rings and the main hand - the ones every expansion so far has had.
 * The merge learns the real set from the roster (`enchants.ts`) and writes it
 * onto every item; this is only the fallback for a snapshot without it.
 */
export const ENCHANT_SLOTS: readonly number[] = [5, 7, 8, 11, 12, 16]

export function takesEnchant(item: GearItem): boolean {
  return item.enchantable ?? ENCHANT_SLOTS.includes(item.slot)
}

const SLOT_KEYS: Record<number, TranslationKey> = {
  1: 'slot.head',
  2: 'slot.neck',
  3: 'slot.shoulder',
  5: 'slot.chest',
  6: 'slot.waist',
  7: 'slot.legs',
  8: 'slot.feet',
  9: 'slot.wrist',
  10: 'slot.hands',
  11: 'slot.ring1',
  12: 'slot.ring2',
  13: 'slot.trinket1',
  14: 'slot.trinket2',
  15: 'slot.back',
  16: 'slot.mainHand',
  17: 'slot.offHand'
}

/**
 * The game's own item quality colours, by quality id. The character page
 * colours an item name the way a tooltip would, so a green in an epic set
 * stands out without a word.
 */
const QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d',
  1: '#ffffff',
  2: '#1eff00',
  3: '#0070dd',
  4: '#a335ee',
  5: '#ff8000',
  6: '#e6cc80',
  7: '#00ccff'
}

export function qualityColor(quality: number | null): string | null {
  return quality === null ? null : (QUALITY_COLORS[quality] ?? null)
}

export function slotLabel(tr: Translator, slot: number): string {
  const key = SLOT_KEYS[slot]
  return key ? tr.t(key) : tr.t('slot.other', { slot })
}

export interface GearCheck {
  /** A source listed the gear at all. */
  known: boolean
  /** Enchantable slots without an enchant. */
  missingEnchants: GearItem[]
  /** Items with more sockets than gems. */
  emptySockets: GearItem[]
  /** Whether any item reported its sockets; without that the socket check says nothing. */
  socketsKnown: boolean
  /** The lowest item level worn, when levels are known for enough of the gear. */
  weakest: GearItem | null
  /** Slots still worth doing something about. */
  issues: number
}

export function checkGear(character: Pick<CharacterSnapshot, 'gear'>, flags: DisplayFlags = DISPLAY_DEFAULTS): GearCheck {
  const gear = character.gear ?? []
  // A check the user switched off is not a check with nothing to say; its
  // lists are simply empty, and the count with them.
  const missingEnchants = flags.gear ? gear.filter((item) => takesEnchant(item) && item.enchantId === 0) : []
  const withSockets = gear.filter((item) => item.sockets !== null)
  const emptySockets = flags.gear ? withSockets.filter((item) => (item.sockets ?? 0) > item.gems) : []

  // One known level is not a weakest slot, it is the only one; and a
  // character with half its gear reported would name the wrong slot.
  const levelled = gear.filter((item) => item.itemLevel !== null && item.itemLevel > 0)
  const weakest = levelled.length >= 8 ? levelled.reduce((low, item) => (item.itemLevel! < low.itemLevel! ? item : low)) : null

  return {
    known: gear.length > 0,
    missingEnchants,
    emptySockets,
    socketsKnown: withSockets.length > 0,
    weakest,
    issues: missingEnchants.length + emptySockets.length
  }
}

/** The chore id of a gear errand on the task list: the kind under `gear:`. */
export const gearChoreId = (kind: GearIssueKind): string => `gear:${kind}`

/**
 * The check with the kinds the player took off the character's week
 * (`skips.ts`) emptied. The gear panel keeps the whole check - a bare slot
 * is a fact - but the list and the plan count only what is a chore.
 */
export function gearChores(character: Pick<CharacterSnapshot, 'gear' | 'skipped'>, flags: DisplayFlags = DISPLAY_DEFAULTS): GearCheck {
  const check = checkGear(character, flags)
  const missingEnchants = wantsChore(character, gearChoreId(GearIssueKind.Enchant)) ? check.missingEnchants : []
  const emptySockets = wantsChore(character, gearChoreId(GearIssueKind.Socket)) ? check.emptySockets : []
  return { ...check, missingEnchants, emptySockets, issues: missingEnchants.length + emptySockets.length }
}

/** The slots of a list of items, named and joined - "Ring, Ring, Feet". */
export function slotList(tr: Translator, items: GearItem[]): string {
  return items.map((item) => slotLabel(tr, item.slot)).join(', ')
}

/** The icon of a gear errand: a wand for an enchant, a gem for a socket. */
export const GEAR_ISSUE_ICONS: Record<GearIssueKind, IconName> = { [GearIssueKind.Enchant]: 'wand', [GearIssueKind.Socket]: 'gem' }

/**
 * The check as a list tip: the count as the heading, a row for each kind
 * of issue with its slots, the weakest slot with its level, and what the
 * check could not say as the note. The table's gear cell and the gear
 * lines of the task list carry it.
 */
export function gearHint(tr: Translator, check: GearCheck): ListTip {
  const rows: ListTip['rows'] = []
  if (check.missingEnchants.length > 0)
    rows.push({ label: tr.t('gear.row.enchant'), value: slotList(tr, check.missingEnchants), tone: Severity.Warn })
  if (check.emptySockets.length > 0) {
    rows.push({
      label: tr.plural('gear.row.sockets', check.emptySockets.length),
      value: slotList(tr, check.emptySockets),
      tone: Severity.Warn
    })
  }
  if (check.weakest) {
    rows.push({
      label: tr.t('gear.row.weakest'),
      value: `${slotLabel(tr, check.weakest.slot)} ${tr.formatNumber(Math.round(check.weakest.itemLevel ?? 0))}`,
      tone: Severity.Info
    })
  }
  return {
    heading: check.issues > 0 ? tr.plural('dash.steps.gear', check.issues) : tr.t('gear.ok'),
    rows,
    note: check.known && !check.socketsKnown ? tr.t('gear.socketsUnknown') : undefined
  }
}
