/** What a goal can be measured against. Each maps to one number per character. */
export enum GoalKind {
  VaultSlots = 'vaultSlots',
  VaultDungeon = 'vaultDungeon',
  VaultRaid = 'vaultRaid',
  VaultWorld = 'vaultWorld',
  MythicRuns = 'mythicRuns',
  RaidBosses = 'raidBosses'
}

export const GOAL_KINDS: readonly GoalKind[] = Object.values(GoalKind)
