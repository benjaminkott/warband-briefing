import type { Translator } from '../../../../shared/i18n'
import type { VaultRow } from '../../../../shared/types'
import type { RosterRow } from '../../model/dashboard'
import { GOAL_LABEL_KEYS, VAULT_LABEL_KEYS } from '../../model/labels'
import type { RingGroup } from '../ui/Ring'

/** A tooltip breaks its lines on this; the tip layer draws each as a line of its own. */
const TIP_BREAK = '\n'

/**
 * The Great Vault as the groups of the ring: one group for each row (raid,
 * dungeon, world). Each group is filled to the progress of the row towards
 * its last slot. The label for the tip shows the progress.
 */
export function vaultRing(tr: Translator, rows: VaultRow[]): RingGroup[] {
  return rows.map((row) => {
    // The thresholds are cumulative, so the threshold of the last slot is the total of the row.
    const last = row.slots[row.slots.length - 1]
    const progress = last?.progress ?? 0
    const threshold = last?.threshold ?? 0
    const label = tr.t(VAULT_LABEL_KEYS[row.category])
    return {
      percent: threshold > 0 ? (Math.min(progress, threshold) / threshold) * 100 : 0,
      label: threshold > 0 ? `${label} · ${tr.t('vault.slotProgress', { progress, threshold })}` : label
    }
  })
}

/**
 * The ring around the vault's three arcs: one fill, the share of the line
 * the reader is working towards.
 *
 * The line is the user's goals where they set any, and the whole vault where
 * they set none - the same line "done for the week" is measured against, so
 * the shape and the word cannot disagree. Several goals count equally: a
 * goal of four runs and a goal of six slots are two halves of the ring, not
 * four tenths and six tenths of it. The tip names each goal with its figures,
 * because the ring itself can only say how far, never which.
 *
 * Null for a character the line means nothing to: one still levelling, one
 * whose rows the player took off altogether.
 */
export function goalRing(tr: Translator, row: RosterRow): RingGroup | null {
  if (row.levelling) return null
  const goals = row.progress.goals
  if (goals.length === 0) {
    if (row.vaultTotal === 0) return null
    return {
      percent: row.ratio * 100,
      label: tr.t('dash.ring.vault', { unlocked: row.vaultUnlocked, total: row.vaultTotal })
    }
  }
  const share = (entry: (typeof goals)[number]): number => (entry.goal.target > 0 ? Math.min(entry.current / entry.goal.target, 1) : 1)
  return {
    percent: (goals.reduce((sum, entry) => sum + share(entry), 0) / goals.length) * 100,
    label: [
      tr.t('dash.ring.goals'),
      ...goals.map((entry) =>
        tr.t('goal.progress', {
          goal: tr.t(GOAL_LABEL_KEYS[entry.goal.kind]),
          current: entry.current,
          target: entry.goal.target
        })
      )
    ].join(TIP_BREAK)
  }
}

/** The classes a roster entry wears: quiet when stale, lit when a vault waits. */
export function rosterClasses(base: string, row: RosterRow): string {
  return [
    base,
    // Quiet since the reset is not the same as unreadably old; only the
    // latter steps back off the board.
    row.inactive ? `${base}-stale` : '',
    row.levelling ? `${base}-levelling` : '',
    row.unclaimed ? `${base}-claim` : '',
    // Done for the week: still on the board, at the end and dimmed, so the
    // open work stands out.
    row.done && !row.unclaimed && !row.levelling ? `${base}-done` : ''
  ]
    .filter(Boolean)
    .join(' ')
}
