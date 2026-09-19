import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { displayFlags } from '../../../../shared/display'
import { CONFIG, DATA_BUNDLE, MAX_LEVEL, RESET_AT, ROSTER } from '../../stories/fixtures'
import { withSkips } from '../../../../shared/skips'
import { CustomTaskScope } from '../../../../shared/enums/customTaskScope'
import { TaskFilter } from '../../enums/taskFilter'
import { TaskGrouping } from '../../enums/taskGrouping'
import './TasksView'

/** Two own chores: one for every character, ticked on the main this week; one for the warband, open. */
const CUSTOM = {
  defs: [
    { id: 'mail', label: 'Post leeren', scope: CustomTaskScope.Character },
    { id: 'ah', label: 'Auktionen erneuern', scope: CustomTaskScope.Warband }
  ],
  ticks: { mail: { [ROSTER[0]!.key]: RESET_AT + 1000 } },
  resetAt: RESET_AT
}

interface Args {
  /** How many of the roster the view gets; one is the player with one character. */
  roster: number
  filter: TaskFilter
  grouping: TaskGrouping
  gameRunning: boolean
  /** The pick mode: every line with a box, the lines taken off drawn dim. */
  /** Whether the first panel is in the pick mode. */
  picking: boolean
}

const meta: Meta<Args> = {
  title: 'Views/TasksView',
  component: 'wt-tasks-view',
  args: { filter: TaskFilter.All, grouping: TaskGrouping.Character, gameRunning: false, picking: false, roster: 99 },
  argTypes: {
    roster: { control: { type: 'number', min: 1 } },
    filter: { control: 'inline-radio', options: Object.values(TaskFilter) },
    grouping: { control: 'inline-radio', options: Object.values(TaskGrouping) },
    gameRunning: { control: 'boolean' },
    picking: { control: 'boolean' }
  },
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    html`<div class="content" style="height: 100vh">
      <wt-tasks-view
        .characters=${withSkips(ROSTER, CONFIG.taskSkips).slice(0, args.roster)}
        .skips=${CONFIG.taskSkips}
        .events=${DATA_BUNDLE.events}
        .goals=${CONFIG.goals}
        .flags=${displayFlags(CONFIG)}
        .maxLevel=${MAX_LEVEL}
        .resetAt=${RESET_AT}
        filter=${args.filter}
        .grouping=${args.grouping}
        .gameRunning=${args.gameRunning}
        .custom=${CUSTOM}
        .picking=${new Set(args.picking ? [ROSTER[0]!.key] : [])}
      ></wt-tasks-view>
    </div>`
}

export default meta

/** The week to work through: one panel per character, most urgent first, the done lines ticked. */
export const ByCharacter: StoryObj<Args> = {}

/** Only what is still open. */
export const Open: StoryObj<Args> = { args: { filter: TaskFilter.Open } }

/** The game runs: the list says that it shows the last logout, so a difference is not a fault. */
export const GameRunning: StoryObj<Args> = { args: { gameRunning: true } }

/** Turned round: one panel per chore, with every character that has it. */
export const ByChore: StoryObj<Args> = { args: { grouping: TaskGrouping.Chore } }

/** The first panel in the pick mode: every chore there is, each with a box; the lines taken off stand dim. The other panels stay the list. */
export const Picking: StoryObj<Args> = { args: { picking: true } }

/** One character: one panel, no grouping switch - the list of a player with a single character. */
export const OneCharacter: StoryObj<Args> = { args: { roster: 1, grouping: TaskGrouping.Chore } }

/** Nobody at the cap: nothing to work through. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-tasks-view .characters=${[]} .flags=${displayFlags(CONFIG)} .maxLevel=${MAX_LEVEL} .resetAt=${RESET_AT}></wt-tasks-view>
    </div>`
}
