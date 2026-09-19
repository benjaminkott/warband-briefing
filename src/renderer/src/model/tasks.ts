/**
 * The task list: every chore of the week, over the whole roster, as one
 * list that can be worked through.
 *
 * The dashboard names one step per character. The task view names every
 * step of every character, each with a box. Only the sources tick a box:
 * the list is read out of the game's data, and nothing on it is set by
 * hand - a box the player could tick would say what the player hopes, not
 * what the character did. What the player does say is which lines are the
 * character's at all (`skips.ts`): a chore taken off is not on the list,
 * and the pick mode is the one place it is still drawn, marked, to be put
 * back.
 *
 * Nothing here re-derives progress: the vault, the gear check and the
 * activity filters all come from `overview.ts` and `gear.ts`. And nothing
 * outside re-counts the list: the table's cell, the reset tile's figure
 * and the "most open" sort read `openCount`, so none of them can disagree
 * with the lines.
 */

import type { AppConfig, CalendarEvent, CharacterSnapshot, CraftCooldown, Goal, WeeklyEvents } from '../../../shared/types'
import type { TranslationKey, Translator } from '../../../shared/i18n'
import { DISPLAY_DEFAULTS, visibleActivities, type DisplayFlags } from '../../../shared/display'
import { gearChoreId, gearChores, GEAR_ISSUE_ICONS, gearHint, slotList } from './gear'
import { VAULT_LABEL_KEYS, VAULT_ROW_ICONS } from './labels'
import { rosterRows, warbandRenown, type RosterRow } from './dashboard'
import { gapDetail, gapNote, gapReward, type Reward } from './plan'
import { priceVaultRow } from '../../../shared/vault'
import { concentrationFull, hasUnclaimedVault } from './overview'
import { seasonMinutes, vaultStepMinutes } from '../../../shared/effort'
import { fullBags, shortSupplies } from '../../../shared/supplies'
import { owedCarried } from '../../../shared/carried'
import { supplyLabel } from './labels'
import { WARBAND, isTicked, type CustomTaskState } from '../../../shared/customTasks'
import { activityChoreId, skippedOf, vaultChoreId, wantsChore, weeklyChoreId, type TaskSkips } from '../../../shared/skips'
import { isOwed } from '../../../shared/weeklyTask'
import type { IconName } from '../components/Icon'
import type { ChipModel } from '../components/ui/Chip'
import { formatWhen } from './format'
import type { VaultCategory } from '../../../shared/enums/vaultCategory'
import { GearIssueKind } from '../enums/gearIssueKind'
import { CustomTaskScope } from '../../../shared/enums/customTaskScope'
import { TaskFilter } from '../enums/taskFilter'
import { TaskGrouping } from '../enums/taskGrouping'
import { TaskKind } from '../enums/taskKind'
import { TaskState } from '../enums/taskState'
import { Severity } from '../enums/severity'
import type { ListTip } from './listTip'

/**
 * The groupings a roster of this size can use. With one character, by chore
 * is the one panel in a worse shape, so only by character is offered - the
 * app is for the player with one character as much as for the one with
 * eight.
 */
export function groupingsFor(rosterSize: number): TaskGrouping[] {
  return rosterSize < 2 ? [TaskGrouping.Character] : [...Object.values(TaskGrouping)]
}

/**
 * The grouping the list draws: the user's choice where the roster can use
 * it, else by character. A choice is `null` until the user makes one.
 */
export function effectiveGrouping(choice: TaskGrouping | null, rosterSize: number): TaskGrouping {
  return choice !== null && groupingsFor(rosterSize).includes(choice) ? choice : TaskGrouping.Character
}

export interface Task {
  /** Unique over the roster: the character's key and the chore's id. */
  key: string
  /** Whose chore it is; null for one of the whole warband. */
  characterKey: string | null
  /**
   * The chore's id, the same on every character that has it - the dungeon
   * row is `vault:dungeon` everywhere - so the list can group by it.
   */
  id: string
  kind: TaskKind
  icon: IconName
  /** What to do, in words: "2 more dungeons", the quest's name, a bare slot. */
  label: string
  /** The name of the chore across characters, for the panel that groups by it. */
  chore: string
  /** Progress, a count, a slot - whatever the chore is measured in. */
  note: string | null
  state: TaskState
  /** A sentence on the line, or rows where the line stands for more than one thing (the supplies, one for each group). */
  tip: string | ListTip | null
  /**
   * What the line pays: the reward of the vault slot it fills, where a
   * source priced it. The reason a player fills the slot at all, so the
   * line says it beside what it takes. Null on every other line.
   */
  reward: Reward | null
  /**
   * What the line takes, in minutes, by the season's figures (`effort.ts`):
   * the price beside the pay-out, so an evening of sixty minutes can be
   * planned from the list. Null where the line is not a step of its own -
   * a goal, a cap, an own chore.
   */
  minutes: number | null
  /**
   * A box the user ticks: one of the user's own chores, which no source can
   * read. Absent on every line the game reports.
   */
  manual?: { subject: string }
  /** The player took the chore off this week (`skips.ts`); only the pick mode lists such a line. */
  skipped: boolean
}

/** The chores of one character, with the count the panel's aside shows. */
export interface CharacterTasks {
  character: CharacterSnapshot
  row: RosterRow
  tasks: Task[]
  done: number
  total: number
}

/** One chore across the roster: the panel of the other grouping. */
export interface ChoreTasks {
  id: string
  kind: TaskKind
  icon: IconName
  label: string
  tasks: Task[]
  done: number
  total: number
}

/** A chore of the whole warband, not of any one character. */
export interface AccountTasks {
  tasks: Task[]
  done: number
  total: number
}

const KIND_ICONS: Record<TaskKind, IconName> = {
  claim: 'vault',
  vault: 'vault',
  weekly: 'scroll',
  activity: 'flag',
  boss: 'star',
  currency: 'coins',
  professionQuest: 'anvil',
  profession: 'anvil',
  gear: 'shield',
  supply: 'bag',
  carried: 'globe',
  paragon: 'medal',
  custom: 'pin'
}

/** A vault row as a chore across the roster carries the vault's name, like the goal on it. */
const VAULT_CHORE_KEYS: Record<VaultCategory, TranslationKey> = {
  raid: 'goal.vaultRaid',
  dungeon: 'goal.vaultDungeon',
  world: 'goal.vaultWorld'
}

/**
 * What a character's line is made of: its id, kind, words and state, and
 * only what differs from a plain line - a note, a tip, a reward,
 * an own mark. The key, the character and the kind's icon follow.
 */
type TaskLine = Pick<Task, 'id' | 'kind' | 'label' | 'chore' | 'state'> &
  Partial<Pick<Task, 'icon' | 'note' | 'tip' | 'reward' | 'minutes' | 'manual'>>

/** The recipes ready to craft: the cooldown has run out, and a charge is left where the recipe counts them. */
export function readyCooldowns(cooldowns: readonly CraftCooldown[], now: number): CraftCooldown[] {
  return cooldowns.filter((cooldown) => cooldown.readyAt <= now && (cooldown.maxCharges === null || (cooldown.charges ?? 0) > 0))
}

const stateOf = (done: boolean, ready?: boolean): TaskState => (done ? TaskState.Done : ready ? TaskState.Ready : TaskState.Open)

/**
 * Every chore of one character, in the order it is worked through: the
 * reward already earned first, then the vault rows, the user's quests, the
 * tracker's activities, the world bosses, the caps, the professions, and
 * last the errands that are not the week's own work - a bare gear slot, a
 * supply that runs short. A goal is not a line: "3 of 6 slots" is the sum
 * of the vault rows above it, a figure the panel's head carries, not a
 * step of its own.
 */
export function characterTasks(
  tr: Translator,
  row: RosterRow,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  custom: CustomTaskState | null = null,
  minimums: AppConfig['supplyMinimums'] | null = null,
  now: number = Date.now()
): Task[] {
  const { character, progress } = row
  const minutes = seasonMinutes()
  const tasks: Task[] = []
  /** One line of the character; what a line has by default is left out. */
  const add = (line: TaskLine): void => {
    tasks.push({
      key: `${character.key}/${line.id}`,
      characterKey: character.key,
      icon: KIND_ICONS[line.kind],
      note: null,
      tip: null,
      reward: null,
      minutes: null,
      skipped: false,
      ...line
    })
  }

  if (hasUnclaimedVault(character)) {
    const label = tr.t('card.unclaimed')
    add({
      id: 'claim',
      kind: TaskKind.Claim,
      label,
      chore: label,
      state: TaskState.Open,
      tip: tr.t('card.unclaimedHint'),
      minutes: minutes.claim
    })
  }

  // Below the cap there is no vault, no lockout and no weekly quest; the
  // reward waiting above is the one thing such a character can be owed.
  if (row.levelling) return tasks

  for (const vaultRow of progress.vaultRows) {
    const rowLabel = tr.t(VAULT_LABEL_KEYS[vaultRow.category])
    // Across the roster the row is named with its vault, the way a goal on
    // it is: a panel called "Dungeons" alone could be the quest.
    const chore = tr.t(VAULT_CHORE_KEYS[vaultRow.category])
    const gap = priceVaultRow(vaultRow, character.itemLevel)
    const slots = vaultRow.slots.length
    const id = vaultChoreId(vaultRow.category)
    const icon = VAULT_ROW_ICONS[vaultRow.category]
    if (!gap) {
      add({ id, kind: TaskKind.Vault, icon, label: rowLabel, chore, note: `${slots}/${slots}`, state: TaskState.Done })
      continue
    }
    const slot = vaultRow.slots[gap.slot - 1]!
    // The tip says where the slot stands and what it pays - the same reason
    // the dashboard gives for its step, so the two never disagree.
    const progressText = tr.t('vault.slotProgress', { progress: slot.progress, threshold: slot.threshold })
    add({
      id,
      kind: TaskKind.Vault,
      icon,
      label: tr.plural(`vault.gap.${vaultRow.category}`, gap.missing),
      chore,
      note: gapNote(gap, tr),
      state: TaskState.Open,
      tip: `${gapDetail(gap, tr)} · ${progressText}`,
      reward: gapReward(gap),
      minutes: vaultStepMinutes(vaultRow.category, gap.missing, minutes)
    })
  }

  for (const quest of character.weeklies) {
    // A quest the log does not have is one step further back than "open":
    // the first thing to do is to pick it up. The word says so.
    const toAccept = isOwed(quest) && quest.onLog === false
    // The account's reward went to another character: the line says so
    // instead of a figure, and asks nothing.
    const paid = !isOwed(quest) && !quest.done
    const figure = paid
      ? quest.rewardTaken?.by
        ? tr.t('task.rewardTaken', { name: quest.rewardTaken.by })
        : tr.t('task.rewardTakenAccount')
      : (quest.progress?.text ?? (toAccept ? tr.t('task.accept') : null))
    // A quest bound to a profession is the profession's week, not the
    // world's: it goes with the concentration under "Berufe" (C10), and
    // names its profession where the figure leaves the room.
    const profession = quest.profession ? character.professions.find((each) => each.skillLineId === quest.profession) : undefined
    add({
      id: weeklyChoreId(quest),
      kind: quest.profession ? TaskKind.ProfessionQuest : TaskKind.Weekly,
      label: quest.label,
      chore: quest.label,
      note: figure ?? profession?.name ?? null,
      state: paid ? TaskState.Paid : stateOf(quest.done, quest.ready),
      tip: paid ? tr.t('task.rewardTakenHint') : quest.ready ? tr.t('task.ready') : toAccept ? tr.t('task.acceptHint') : null,
      minutes: paid ? null : minutes.weekly
    })
  }

  for (const activity of visibleActivities(character.activities, flags)) {
    const figure = activity.progress?.text ?? null
    add({
      id: activityChoreId(activity),
      kind: TaskKind.Activity,
      label: activity.label,
      chore: activity.label,
      note: figure,
      state: stateOf(activity.done, activity.ready),
      tip: activity.ready ? `${tr.t('task.ready')} · ${tr.t('card.activityHint')}` : tr.t('card.activityHint'),
      minutes: minutes.activity
    })
  }

  for (const boss of character.worldBosses) {
    add({
      id: `boss:${boss.name}`,
      kind: TaskKind.Boss,
      label: boss.name,
      chore: boss.name,
      note: tr.t('area.worldBosses'),
      state: stateOf(boss.defeated),
      minutes: minutes.worldBoss
    })
  }

  // A currency with a weekly cap is a measurable chore: what the week can
  // still earn of it. Full is done - the way the other lists count it. The
  // cap is the week's, not the character's, so the line is only for a
  // character that plays the content the currency comes from.
  {
    for (const currency of progress.weeklyCurrencies) {
      const earned = currency.earnedThisWeek ?? 0
      const max = currency.weeklyMax ?? 0
      const figure = `${tr.formatNumber(Math.min(earned, max))}/${tr.formatNumber(max)}`
      add({
        id: `currency:${currency.id}`,
        kind: TaskKind.Currency,
        label: currency.name,
        chore: currency.name,
        note: figure,
        state: stateOf(earned >= max),
        tip: tr.t('tasks.capHint')
      })
    }
  }

  // Concentration at the cap is regeneration thrown away: the one profession
  // worth a visit. A bar below the cap is not a chore, so it is not listed.
  for (const profession of character.professions.filter(concentrationFull)) {
    add({
      id: `profession:${profession.skillLineId}`,
      kind: TaskKind.Profession,
      label: profession.name,
      chore: tr.t('tasks.chore.concentration'),
      note: `${tr.formatNumber(profession.concentration.current)}/${tr.formatNumber(profession.concentration.max)}`,
      state: TaskState.Open,
      tip: tr.t('profession.concentrationFull'),
      minutes: minutes.concentration
    })
  }

  // Knowledge earned and not spent buys nothing: a visit to the tree. Only
  // the companion knows the figure; a profession without it has no line.
  for (const profession of character.professions.filter((each) => (each.knowledge ?? 0) > 0)) {
    add({
      id: `knowledge:${profession.skillLineId}`,
      kind: TaskKind.Profession,
      label: tr.t('tasks.knowledge', { name: profession.name }),
      chore: tr.t('tasks.chore.knowledge'),
      // The chore says "knowledge"; the note is the count alone, so the line has room for its minutes.
      note: tr.plural('tasks.knowledgeNote', profession.knowledge ?? 0),
      state: TaskState.Open,
      tip: tr.t('profession.knowledgeHint'),
      minutes: minutes.concentration
    })
  }

  // A bare slot is one trip to the auction house. One task per kind of
  // issue, the way the card lists them, so the two are two panels across
  // the roster.
  {
    const check = gearChores(character, flags)
    const hint = gearHint(tr, check)
    if (check.missingEnchants.length > 0) {
      add({
        id: gearChoreId(GearIssueKind.Enchant),
        kind: TaskKind.Gear,
        icon: GEAR_ISSUE_ICONS[GearIssueKind.Enchant],
        label: tr.t('gear.missingEnchant', { slots: slotList(tr, check.missingEnchants) }),
        chore: tr.t('tasks.chore.enchants'),
        state: TaskState.Open,
        tip: hint,
        minutes: check.missingEnchants.length * minutes.gear
      })
    }
    if (check.emptySockets.length > 0) {
      add({
        id: gearChoreId(GearIssueKind.Socket),
        kind: TaskKind.Gear,
        icon: GEAR_ISSUE_ICONS[GearIssueKind.Socket],
        label: tr.plural('gear.emptySockets', check.emptySockets.length, { slots: slotList(tr, check.emptySockets) }),
        chore: tr.t('tasks.chore.sockets'),
        state: TaskState.Open,
        tip: hint,
        minutes: check.emptySockets.length * minutes.gear
      })
    }
  }

  // Too few flasks, too few potions: one trip to the auction house or the
  // bank, before the group stands - one line for the trip, whatever it has
  // to bring back; the tip lists that, a row for each group with what the
  // bags hold of what is wanted, and the bank's stock where it has some.
  // Only where a source lists the bags (supplies.ts).
  const short = shortSupplies(character, minimums)
  if (short.length > 0) {
    const names = short.map((stock) => supplyLabel(tr, stock.group))
    add({
      id: 'supplies',
      kind: TaskKind.Supply,
      label: tr.t('tasks.supplies'),
      chore: tr.t('tasks.supplies'),
      note: names.join(', '),
      state: TaskState.Open,
      tip: {
        heading: tr.t('tasks.supplies'),
        rows: short.map((stock, index) => {
          const figure = `${tr.formatNumber(stock.inBags)}/${tr.formatNumber(stock.needed)}`
          return {
            label: names[index]!,
            value: stock.inBank > 0 ? `${figure} · ${tr.t('tasks.supplyBank', { bank: tr.formatNumber(stock.inBank) })}` : figure,
            tone: Severity.Warn
          }
        }),
        note: tr.t('tasks.suppliesHint')
      },
      minutes: minutes.supply
    })
  }

  // Bags nearly full: the next run's loot has nowhere to go. One trip to the
  // vendor or the bank, for a character that plays content at all.
  const bags = fullBags(character)
  if (bags) {
    const figure = tr.t('tasks.bagsFree', { free: tr.formatNumber(bags.free) })
    add({
      id: 'bags',
      kind: TaskKind.Supply,
      label: tr.t('tasks.bags'),
      chore: tr.t('tasks.bags'),
      note: figure,
      state: TaskState.Open,
      tip: tr.t('tasks.bagsHint', { free: tr.formatNumber(bags.free), total: tr.formatNumber(bags.total) }),
      minutes: minutes.supply
    })
  }

  // A map to a trove in the bags is a delve owed: the line stands as long
  // as the character carries it, and goes with the map (carried.ts).
  for (const stock of owedCarried(character)) {
    add({
      id: `carried:${stock.group.id}`,
      kind: TaskKind.Carried,
      label: tr.t('tasks.carried', { name: stock.name }),
      chore: stock.name,
      state: TaskState.Open,
      tip: tr.t('tasks.carriedHint', { bags: tr.formatNumber(stock.inBags), bank: tr.formatNumber(stock.inBank) }),
      minutes: stock.group.minutes ?? minutes.worldActivity
    })
  }

  // A recipe whose cooldown has run out is a craft owed - the daily
  // transmute, the weekly cloth. The companion read it the last time the
  // profession window was open, and a craft happens there, so a used
  // cooldown is seen used. Only ready ones are lines; one that runs is
  // the concentration below the cap, not a chore.
  for (const cooldown of readyCooldowns(character.cooldowns ?? [], now)) {
    const charges = cooldown.maxCharges ? `${tr.formatNumber(cooldown.charges ?? 0)}/${tr.formatNumber(cooldown.maxCharges)}` : null
    add({
      id: `craft:${cooldown.recipeId}`,
      kind: TaskKind.Profession,
      label: tr.t('tasks.craft', { name: cooldown.name || `#${cooldown.recipeId}` }),
      chore: tr.t('tasks.chore.craft'),
      note: charges,
      state: TaskState.Open,
      tip: tr.t('tasks.craftHint'),
      minutes: minutes.concentration
    })
  }

  // The user's own chores, one line each, a box the user ticks; the tick
  // is the character's own.
  if (custom) {
    for (const def of custom.defs.filter((each) => each.scope === CustomTaskScope.Character)) {
      const done = isTicked(custom.ticks, def.id, character.key, custom.resetAt)
      add({
        id: `custom:${def.id}`,
        kind: TaskKind.Custom,
        label: def.label,
        chore: def.label,
        state: done ? TaskState.Done : TaskState.Open,
        tip: tr.t('tasks.customHint'),
        manual: { subject: character.key }
      })
    }
  }

  // The vault rows and the gear errands were asked before they were made;
  // every other line is asked here, so nothing the player took off is a line.
  return tasks.filter((task) => wantsChore(character, task.id))
}

const doneCount = (tasks: Task[]): number => tasks.filter((task) => task.state === TaskState.Done).length

/** The lines a count is over: not one the player took off, not one paid to another character. */
export const counted = (tasks: Task[]): Task[] => tasks.filter((task) => !task.skipped && task.state !== TaskState.Paid)

/** The lines the player kept: what a count is over, in the pick mode as outside it. */
const kept = counted

/** Whose skips a line's box writes: the character's, or the warband's. */
export function skipSubject(task: Pick<Task, 'characterKey'>): string {
  return task.characterKey ?? WARBAND
}

/** The group with its skipped lines marked and its count over the rest. */
function marked<T extends { tasks: Task[]; done: number; total: number }>(group: T, skipped: readonly string[]): T {
  const tasks = group.tasks.map((task) => ({ ...task, skipped: skipped.includes(task.id) }))
  const wanted = kept(tasks)
  return { ...group, tasks, done: doneCount(wanted), total: wanted.length }
}

/**
 * The list as the pick mode draws it: built over the roster with nothing
 * taken off (`withoutSkips`), so every chore there is is a line,
 * and then each line marked whether the player took it off. The counts
 * stay the week's: over the lines kept.
 */
export function pickList(byCharacter: CharacterTasks[], skips: TaskSkips): CharacterTasks[] {
  return byCharacter.map((entry) => marked(entry, skippedOf(skips, entry.character.key)))
}

/** The warband's lines the same way. */
export function pickAccount(account: AccountTasks, skips: TaskSkips): AccountTasks {
  return marked(account, skippedOf(skips, WARBAND))
}

/**
 * How many lines of one character are open: the one count the table's
 * cell, the figure on the reset tile and the "most open" sort read, so
 * none of them can disagree with the list.
 */
export function openCount(
  tr: Translator,
  row: RosterRow,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  custom: CustomTaskState | null = null,
  minimums: AppConfig['supplyMinimums'] | null = null,
  now: number = Date.now()
): number {
  return characterTasks(tr, row, flags, custom, minimums, now).filter((task) => task.state !== TaskState.Done).length
}

/**
 * The roster's chores, one entry per character, in the dashboard's order
 * of urgency - so the character worth logging into first is at the top.
 * A character without a single chore is left out: there is nothing to
 * work through.
 */
export function tasksByCharacter(
  tr: Translator,
  characters: CharacterSnapshot[],
  goals: Goal[],
  maxLevel: number,
  resetAt: number,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  custom: CustomTaskState | null = null,
  minimums: AppConfig['supplyMinimums'] | null = null,
  now: number = Date.now()
): CharacterTasks[] {
  return rosterRows(characters, goals, maxLevel, resetAt, tr, flags)
    .map((row) => {
      const tasks = characterTasks(tr, row, flags, custom, minimums, now)
      return { character: row.character, row, tasks, done: doneCount(tasks), total: counted(tasks).length }
    })
    .filter((entry) => entry.total > 0)
}

/**
 * The same chores turned round: one entry per chore, with every character
 * that has it. The chores keep the order they come in on a character - the
 * vault's rows in the vault's order, the quests in the order they were set
 * up - and within a chore the characters keep their order of urgency.
 */
export function tasksByChore(byCharacter: CharacterTasks[]): ChoreTasks[] {
  const chores = new Map<string, ChoreTasks>()
  for (const entry of byCharacter) {
    for (const task of entry.tasks) {
      let chore = chores.get(task.id)
      if (!chore) {
        chore = { id: task.id, kind: task.kind, icon: task.icon, label: task.chore, tasks: [], done: 0, total: 0 }
        chores.set(task.id, chore)
      }
      chore.tasks.push(task)
    }
  }
  // A chore only the second character has was appended after the first
  // character's last; the sort by kind puts it back among its own. It is
  // stable, so the order within a kind stays the order they were met in.
  const order: TaskKind[] = [
    TaskKind.Claim,
    TaskKind.Vault,
    TaskKind.Weekly,
    TaskKind.Activity,
    TaskKind.Boss,
    TaskKind.Currency,
    TaskKind.ProfessionQuest,
    TaskKind.Profession,
    TaskKind.Gear,
    TaskKind.Supply,
    TaskKind.Carried,
    TaskKind.Paragon
  ]
  return [...chores.values()]
    .map((chore) => ({ ...chore, done: doneCount(kept(chore.tasks)), total: kept(chore.tasks).length }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

/**
 * The chores turned round, split: the ones two or more characters share
 * keep a panel each - that is what the grouping is for, a night of the
 * same key on every alt - and the ones only one character has are gathered
 * into one panel, each line naming its character. A panel for each of
 * those was a caption over one line, eight times down the stage.
 */
export function splitShared(chores: ChoreTasks[]): { shared: ChoreTasks[]; singles: Task[] } {
  const shared = chores.filter((chore) => chore.tasks.length > 1)
  const singles = chores.filter((chore) => chore.tasks.length === 1).flatMap((chore) => chore.tasks)
  return { shared, singles }
}

/** The sections a character's chores fall into, in the order they are worked through. */
export const TASK_SECTIONS: Array<{ id: string; kinds: TaskKind[]; labelKey: TranslationKey }> = [
  { id: 'vault', kinds: [TaskKind.Claim, TaskKind.Vault], labelKey: 'tasks.section.vault' },
  // The week's quests, the tracker's activities and the world bosses under
  // one caption: each is one visit that the week counts once. A boss alone
  // was a caption over one line.
  { id: 'quests', kinds: [TaskKind.Weekly, TaskKind.Activity, TaskKind.Boss], labelKey: 'tasks.section.quests' },
  { id: 'caps', kinds: [TaskKind.Currency], labelKey: 'tasks.section.caps' },
  // The profession's week as one caption: its quests and the concentration
  // that is full. A crafter reads it as its list; a raider has none of it.
  { id: 'professions', kinds: [TaskKind.ProfessionQuest, TaskKind.Profession], labelKey: 'tasks.section.professions' },
  { id: 'errands', kinds: [TaskKind.Gear, TaskKind.Supply, TaskKind.Carried], labelKey: 'tasks.section.errands' },
  { id: 'warband', kinds: [TaskKind.Paragon], labelKey: 'tasks.warband' },
  // Apart from the measured lines on purpose: a box a hand ticked, last.
  { id: 'custom', kinds: [TaskKind.Custom], labelKey: 'tasks.section.custom' }
]

/** A run of lines under one caption, with its own count. */
export interface TaskSection {
  id: string
  labelKey: TranslationKey
  tasks: Task[]
  done: number
  total: number
}

/**
 * A character's lines in sections, empty sections left out: the vault, the
 * quests, the caps, the professions, the errands. Thirteen lines in one
 * run are a wall; five captions with a count each read as a plan - and a
 * caption over one line is no order, so the sections are few.
 */
export function taskSections(tasks: Task[]): TaskSection[] {
  return TASK_SECTIONS.map((section) => {
    const own = tasks.filter((task) => section.kinds.includes(task.kind))
    return { id: section.id, labelKey: section.labelKey, tasks: own, done: doneCount(kept(own)), total: kept(own).length }
  }).filter((section) => section.tasks.length > 0)
}

/** Whether a line passes the filter: every line for `All`, the open ones for `Open`. */
export function keepTask(task: Pick<Task, 'state'>, filter: TaskFilter): boolean {
  return filter === TaskFilter.All || task.state !== TaskState.Done
}

/** What the warband owes as a whole: a paragon reward waiting at a faction, and its own chores. */
export function accountTasks(
  tr: Translator,
  characters: CharacterSnapshot[],
  custom: CustomTaskState | null = null,
  skips: TaskSkips | null = null
): AccountTasks {
  const lines: Task[] = []
  for (const faction of warbandRenown(characters)) {
    if (!faction.paragon?.rewardPending) continue
    lines.push({
      key: `account/paragon:${faction.factionId}`,
      characterKey: null,
      id: `paragon:${faction.factionId}`,
      kind: TaskKind.Paragon,
      icon: KIND_ICONS.paragon,
      label: faction.name,
      chore: tr.t('renown.paragon'),
      note: tr.t('renown.rewardReady'),
      state: TaskState.Open,
      tip: null,
      reward: null,
      minutes: null,
      skipped: false
    })
  }
  // The warband's own chores: once for the account, ticked once.
  for (const def of (custom?.defs ?? []).filter((each) => each.scope === CustomTaskScope.Warband)) {
    const done = isTicked(custom!.ticks, def.id, WARBAND, custom!.resetAt)
    lines.push({
      key: `account/custom:${def.id}`,
      characterKey: null,
      id: `custom:${def.id}`,
      kind: TaskKind.Custom,
      icon: KIND_ICONS.custom,
      label: def.label,
      chore: def.label,
      note: null,
      state: done ? TaskState.Done : TaskState.Open,
      tip: tr.t('tasks.customHint'),
      reward: null,
      minutes: null,
      manual: { subject: WARBAND },
      skipped: false
    })
  }
  const tasks = lines.filter((task) => !skippedOf(skips, WARBAND).includes(task.id))
  return { tasks, done: doneCount(tasks), total: tasks.length }
}

/**
 * The calendar's events that still run. The calendar's answer is a day's
 * list, and a read from Tuesday can name an event that ended on Wednesday
 * morning.
 */
export function runningEvents(events: WeeklyEvents | null, now: number): CalendarEvent[] {
  return (events?.list ?? []).filter((event) => !event.endsAt || event.endsAt > now)
}

/** A running event as a chip on the warband's panel: its name, and until when it runs. */
export function eventChip(tr: Translator, event: CalendarEvent): ChipModel {
  return {
    label: event.title,
    icon: 'calendar',
    note: event.endsAt ? tr.t('tasks.eventUntil', { time: formatWhen(tr, event.endsAt) }) : undefined
  }
}

/** The tasks the filter keeps. */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return filter === TaskFilter.All ? tasks : tasks.filter((task) => keepTask(task, filter))
}

/** The week over everything on the list: what the head line counts. */
export function taskTotals(groups: Array<{ done: number; total: number }>): { done: number; total: number } {
  return groups.reduce((sum, group) => ({ done: sum.done + group.done, total: sum.total + group.total }), { done: 0, total: 0 })
}

/** What the box and the words of a task row say, worked out once for the list and the character page. */
export interface TaskRow {
  done: boolean
  ready: boolean
  /** The account's reward went to another character: the line asks nothing. */
  paid: boolean
  /** The box is the sources' word - except on the user's own chore, where the hand is the only source there is. */
  manual: boolean
  /** What the box shows: the sources' word, or in the pick mode whether the line is kept. */
  checked: boolean
  /** Whether the box takes a hand: an own chore's, or any line's in the pick mode. */
  takesHand: boolean
  /** The tooltip of the box. */
  tip: string
  /** Whether the line says what to do: in a panel of one chore across the roster, only where that differs from the caption. */
  showLabel: boolean
}

export function taskRow(tr: Translator, task: Task, named: boolean, picking = false): TaskRow {
  const done = task.state === TaskState.Done
  const manual = task.manual !== undefined
  return {
    done,
    ready: task.state === TaskState.Ready,
    paid: task.state === TaskState.Paid,
    manual,
    checked: picking ? !task.skipped : done,
    takesHand: picking || manual,
    tip: picking
      ? tr.t(task.skipped ? 'tasks.pick.offHint' : 'tasks.pick.onHint')
      : manual
        ? tr.t('tasks.customHint')
        : done
          ? tr.t('tasks.doneHint')
          : task.state === TaskState.Paid
            ? tr.t('task.rewardTakenHint')
            : tr.t('tasks.openHint'),
    showLabel: !named || task.label !== task.chore
  }
}

/** The tick of an own chore as the `wt-task-tick` detail; null on a line no hand can tick. */
export function manualTick(task: Task, done: boolean): { id: string; subject: string; done: boolean } | null {
  const manual = task.manual
  return manual ? { id: task.id.slice('custom:'.length), subject: manual.subject, done } : null
}
