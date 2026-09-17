import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { displayFlags } from '../../../../shared/display'
import { ALT_UNCLAIMED, CONFIG, MAIN, MAX_LEVEL, RESET_AT, translatorFor } from '../../stories/fixtures'
import { rosterRows } from '../../model/dashboard'
import { characterTasks } from '../../model/tasks'
import { isListTip } from '../../model/listTip'
import { TaskKind } from '../../enums/taskKind'
import { raidCellTip, raidRows } from '../detail/model'
import './ListTip'
import './Tip'
import '../detail/DetailRaids'

const meta: Meta = {
  title: 'UI/ListTip',
  component: 'wt-list-tip',
  render: (_args, context) => {
    const tr = translatorFor(context)
    const cells = raidRows(MAIN.raidProgress ?? [])[0]?.cells ?? []
    return html`<div style="display: flex; gap: var(--s4); align-items: flex-start">
      ${cells.map((cell) => html`<wt-tip class="hover-tip" style="position: static; transform: none"><wt-list-tip .tip=${raidCellTip(tr, cell)}></wt-list-tip></wt-tip>`)}
    </div>`
  }
}

export default meta

/** The tips of the raid cells of the fixture, one for each difficulty: the difficulty with the count as the heading, a boss on each row, its kills in green or `open` in amber at the right. */
export const RaidCells: StoryObj = {}

/** The alt's supplies errand: a group on each row with what the bags hold of what the focus wants, the hint as the note under them. */
export const Supplies: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const row = rosterRows([ALT_UNCLAIMED], CONFIG.goals, MAX_LEVEL, RESET_AT, tr, displayFlags(CONFIG))[0]!
    const tip = characterTasks(tr, row, displayFlags(CONFIG)).find((task) => task.kind === TaskKind.Supply)?.tip
    return html`<wt-tip class="hover-tip" style="position: static; transform: none"
      ><wt-list-tip .tip=${isListTip(tip) ? tip : null}></wt-list-tip
    ></wt-tip>`
  }
}

/** On the cells: rest the pointer on a count. */
export const OnCells: StoryObj = {
  render: () => html`<wt-detail-raids .raids=${MAIN.raidProgress}></wt-detail-raids>`
}
