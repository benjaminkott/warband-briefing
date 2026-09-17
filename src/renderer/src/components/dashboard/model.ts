import type { Translator } from '../../../../shared/i18n'
import type { VaultRow } from '../../../../shared/types'
import type { RosterRow } from '../../model/dashboard'
import { VAULT_LABEL_KEYS } from '../../model/labels'
import type { RingGroup } from '../ui/Ring'

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
