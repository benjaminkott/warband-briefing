import type { Translator } from '../../../../shared/i18n'
import type { VaultRow } from '../../../../shared/types'
import { rewardColor, rowReward, type RosterRow } from '../../model/dashboard'
import { overTheLine } from '../../model/overview'
import { GOAL_LABEL_KEYS, VAULT_LABEL_KEYS } from '../../model/labels'
import type { RingGroup } from '../ui/Ring'

/** A tooltip breaks its lines on this; the tip layer draws each as a line of its own. */
const TIP_BREAK = '\n'

/**
 * The Great Vault as the groups of the ring: one group for each row (raid,
 * dungeon, world). Each group is filled to the progress of the row towards
 * its last slot. The label for the tip shows the progress.
 *
 * With a `scale`, the arc is drawn in the colour of what its row pays: the
 * item level of the best reward the row reports, on the board's own band
 * (`rewardScale`). Two things are then read off one arc - how far the row
 * is, and what it is worth - and the tip names the figure the colour stands
 * for, because a colour alone is not a number.
 */
export function vaultRing(tr: Translator, rows: VaultRow[], scale: { lo: number; hi: number } | null = null): RingGroup[] {
  return rows.map((row) => {
    // The thresholds are cumulative, so the threshold of the last slot is the total of the row.
    const last = row.slots[row.slots.length - 1]
    const progress = last?.progress ?? 0
    const threshold = last?.threshold ?? 0
    const label = tr.t(VAULT_LABEL_KEYS[row.category])
    const reward = rowReward(row)
    const color = rewardColor(reward, scale)
    return {
      percent: threshold > 0 ? (Math.min(progress, threshold) / threshold) * 100 : 0,
      label: [
        threshold > 0 ? `${label} · ${tr.t('vault.slotProgress', { progress, threshold })}` : label,
        // Only where the colour means something: an uncoloured arc needs no
        // figure to explain it.
        color === null ? null : tr.t('vault.rewardLevel', { level: reward! })
      ]
        .filter(Boolean)
        .join(' · '),
      ...(color === null ? {} : { color })
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
 * describing last week - a snapshot from before the reset cannot have met
 * anything, and a closed ring on one would be a lie - and one whose rows the
 * player took off altogether.
 */
export function goalRing(tr: Translator, row: RosterRow): RingGroup | null {
  if (row.levelling || row.character.stale) return null
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
    // Over the line the user drew. A reward still waiting beats it: that one
    // is lost at the reset, and no finished week makes it less urgent.
    overTheLine(row.progress) && !row.levelling ? `${base}-goals` : '',
    // Done for the week: still on the board, at the end and dimmed, so the
    // open work stands out.
    row.done && !row.unclaimed && !row.levelling ? `${base}-done` : ''
  ]
    .filter(Boolean)
    .join(' ')
}
