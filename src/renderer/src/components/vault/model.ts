import type { VaultSlot } from '../../../../shared/types'
import { difficultyLabel, raidTierLabel, type Translator } from '../../../../shared/i18n'
import { VAULT_REQ_KEYS } from '../../model/labels'
import { VaultCategory } from '../../../../shared/enums/vaultCategory'

/**
 * What an unlocked slot says about its reward track: the key level for a
 * dungeon slot, the difficulty for a raid slot, the tier for a world slot.
 */
export function slotLevelText(tr: Translator, slot: VaultSlot, category: VaultCategory): string {
  if (category === VaultCategory.Dungeon) return `+${slot.level}`
  if (category === VaultCategory.Raid) {
    // A difficulty id is exact; the positional tier is the fallback.
    return slot.difficultyId ? difficultyLabel(tr, slot.difficultyId, '', true) : raidTierLabel(tr, slot.level)
  }
  return tr.t('vault.tier', { level: slot.level })
}

/**
 * A slot's tooltip: what it asks for, where the row stands against that, and
 * the reward by name where the companion addon knows it.
 */
export function slotHint(tr: Translator, slot: VaultSlot, category: VaultCategory): string {
  return [
    tr.plural(VAULT_REQ_KEYS[category], slot.threshold),
    slot.unlocked
      ? tr.t('vault.slotReached', { threshold: slot.threshold })
      : tr.t('vault.slotProgress', { progress: slot.progress, threshold: slot.threshold }),
    slot.rewardItem ? tr.t('vault.reward', { item: slot.rewardItem }) : null
  ]
    .filter(Boolean)
    .join(' · ')
}
