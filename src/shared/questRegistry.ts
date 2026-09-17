/**
 * The season's weekly quests, learned from the game.
 *
 * The companion keeps a register of every quest any character had on its
 * log, with what the client says about the quest. The register outlives
 * the weekly reset, so the app can name a season weekly in a week nobody
 * did it. This module holds the rule that picks the season's weeklies out
 * of the register; the settings screen offers them beside the catalog.
 */

import type { WeeklyQuestDef } from './types'
import { QuestReset } from './enums/questReset'

/**
 * One quest as the companion registered it. The words are the client's
 * enum names (`Enum.QuestFrequency`, `Enum.QuestClassification`), so a
 * patch that moves the numbers does not move the meaning.
 */
export interface RegisteredQuest {
  id: number
  title: string
  /** `Default`, `Daily`, `Weekly` or `ResetByScheduler`. */
  frequency: string
  /** `Meta`, `Recurring`, `Normal`, ... - null where the client had none. */
  classification: string | null
  /** The expansion the quest belongs to, as the client numbers them. */
  expansion: number | null
  /** The skill line of the profession the quest is for, from its tag. */
  profession: number | null
  /** Completes once for the whole account. */
  account: boolean
  /** A hidden tracking quest, never shown on the log. */
  hidden: boolean
  /** Learned across a reset: completed before it, clear after it. */
  resets: QuestReset.Weekly | null
  /** Epoch millis of the last log that showed the quest. */
  seenAt: number
  /** Epoch millis of the last turn-in the companion saw, or null. */
  doneAt: number | null
}

/** The register with the expansion the client is on. */
export interface QuestRegistry {
  expansion: number | null
  quests: RegisteredQuest[]
}

/**
 * True for a quest that comes back every week. The client's weekly flag
 * says so for most; a meta quest ("Midnight: Delves") is the season's
 * wrapper and resets with it whatever its flag; and a quest seen to clear
 * across a reset is weekly whatever the client had said.
 */
export function isWeekly(quest: RegisteredQuest): boolean {
  return quest.resets === QuestReset.Weekly || quest.frequency === 'Weekly' || quest.classification === 'Meta'
}

/**
 * The season's weeklies: every weekly of the current expansion that a
 * player can see on the log. A hidden tracking quest is not a task; a
 * quest of an older expansion is not the season's. Without the expansion
 * the register cannot tell the seasons apart, and nothing qualifies.
 */
export function seasonWeeklies(registry: QuestRegistry): WeeklyQuestDef[] {
  if (registry.expansion === null) return []
  return registry.quests
    .filter((quest) => !quest.hidden && quest.expansion === registry.expansion && isWeekly(quest))
    .filter((quest) => quest.title.length > 0)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0) || b.seenAt - a.seenAt || a.id - b.id)
    .map((quest) => ({ id: quest.id, label: quest.title }))
}

/**
 * The profession a quest is for, from the tag the client puts on it:
 * "Alchemy Services Requested" carries the skill line of Alchemy. The tag
 * is the only binding; a name is a translation and a hand is wrong. A
 * pool is bound where one of its quests is. Null where no tag names one.
 */
export function questProfession(registry: QuestRegistry, ids: number[]): number | null {
  for (const id of ids) {
    const quest = registry.quests.find((entry) => entry.id === id)
    if (quest?.profession) return quest.profession
  }
  return null
}

/**
 * True for a quest a source saw that the settings screen can offer. The
 * register knows more about a quest than the source that saw it: a hidden
 * tracking quest is not a task, a weekly of an older expansion is a
 * leftover on an alt's log, not the season's. A quest the register does
 * not know is offered as seen - without the companion there is no register.
 */
export function isOffered(registry: QuestRegistry, id: number): boolean {
  const quest = registry.quests.find((entry) => entry.id === id)
  if (!quest) return true
  if (quest.hidden) return false
  return registry.expansion === null || quest.expansion === null || quest.expansion === registry.expansion
}

/**
 * Whether the game offers a quest this week: true when a log showed it or
 * a turn-in ticked it since the reset, false when the register knows the
 * quest and nobody saw it, null when the register does not know it. The
 * season's pool rotates - "Midnight: Abundance" is on the board one week
 * and not the next - and the register is the only record of what the
 * board holds: the client offers no list.
 */
export function seenThisWeek(registry: QuestRegistry, id: number, resetAt: number): boolean | null {
  const quest = registry.quests.find((entry) => entry.id === id)
  if (!quest) return null
  return quest.seenAt >= resetAt || (quest.doneAt ?? 0) >= resetAt
}

/**
 * Two registers as one, quest by quest: the record seen last wins, and a
 * learned reset is kept from either side. Every WTF account has a register
 * of its own; the app reads them all.
 */
export function mergeRegistries(registries: QuestRegistry[]): QuestRegistry {
  const byId = new Map<number, RegisteredQuest>()
  let expansion: number | null = null
  for (const registry of registries) {
    if (registry.expansion !== null && (expansion === null || registry.expansion > expansion)) expansion = registry.expansion
    for (const quest of registry.quests) {
      const known = byId.get(quest.id)
      const newer = !known || quest.seenAt >= known.seenAt ? quest : known
      const older = newer === quest ? known : quest
      byId.set(quest.id, {
        ...newer,
        resets: newer.resets ?? older?.resets ?? null,
        doneAt: Math.max(newer.doneAt ?? 0, older?.doneAt ?? 0) || null
      })
    }
  }
  return { expansion, quests: [...byId.values()] }
}
