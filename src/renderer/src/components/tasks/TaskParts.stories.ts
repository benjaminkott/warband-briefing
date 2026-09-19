import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { displayFlags } from '../../../../shared/display'
import { rosterRows } from '../../model/dashboard'
import { accountTasks, characterTasks, counted, runningEvents, tasksByCharacter, tasksByChore } from '../../model/tasks'
import { ALT_UNCLAIMED, CONFIG, DATA_BUNDLE, MAIN, MAX_LEVEL, RESET_AT, ROSTER, translatorFor } from '../../stories/fixtures'
import { TaskState } from '../../enums/taskState'
import './TaskGroup'
import './TaskList'

const flags = displayFlags(CONFIG)

const meta: Meta = {
  title: 'Tasks/TaskParts'
}

export default meta

/** The run of lines on its own: the main's chores in their sections, each line with its minutes. */
export const List: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const row = rosterRows([MAIN], CONFIG.goals, MAX_LEVEL, RESET_AT, tr, flags)[0]!
    return html`<wt-task-list style="max-width: 420px" .tasks=${characterTasks(tr, row, flags)} sectioned></wt-task-list>`
  }
}

/** The main's chores as lines: open, ready, and done as the game reports it. */
export const Rows: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const row = rosterRows([MAIN], CONFIG.goals, MAX_LEVEL, RESET_AT, tr, flags)[0]!
    const tasks = characterTasks(tr, row, flags)
    return html`<wt-task-group
      style="max-width: 420px"
      .character=${MAIN}
      .tasks=${tasks}
      .goals=${row.progress.goals}
      done=${counted(tasks).filter((task) => task.state === TaskState.Done).length}
      total=${tasks.length}
    ></wt-task-group>`
  }
}

/** A character's panel, the alt with a reward waiting beside it, and a profession alt: the summary line under the head, only its own chores below. */
export const CharacterGroups: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const entries = tasksByCharacter(
      tr,
      [MAIN, ALT_UNCLAIMED, { ...ALT_UNCLAIMED, key: 'crafter', name: 'Handwerk', vaultRewardWaiting: false }],
      CONFIG.goals,
      MAX_LEVEL,
      RESET_AT,
      flags
    )
    return html`<div class="task-groups">
      ${entries.map(
        (entry) =>
          html`<wt-task-group
            .character=${entry.character}
            .tasks=${entry.tasks}
            .goals=${entry.row.progress.goals}
            done=${entry.done}
            total=${entry.total}
          ></wt-task-group>`
      )}
    </div>`
  }
}

/** The warband's panel: the running events as the week's frame under the caption, the account's own lines below. */
export const Warband: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const account = accountTasks(tr, ROSTER)
    return html`<wt-task-group
      style="max-width: 420px"
      heading=${tr.t('tasks.warband')}
      icon="medal"
      .events=${runningEvents(DATA_BUNDLE.events ?? null, Date.now())}
      .tasks=${account.tasks}
      done=${account.done}
      total=${account.total}
    ></wt-task-group>`
  }
}

/** The same chores turned round: one panel per chore, every character on a line. */
export const ChoreGroups: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const byKey = new Map(ROSTER.map((character) => [character.key, character]))
    const chores = tasksByChore(tasksByCharacter(tr, ROSTER, CONFIG.goals, MAX_LEVEL, RESET_AT, flags))
    return html`<div class="task-groups">
      ${chores
        .slice(0, 4)
        .map(
          (chore) =>
            html`<wt-task-group
              heading=${chore.label}
              icon=${chore.icon}
              .tasks=${chore.tasks}
              done=${chore.done}
              total=${chore.total}
              .characters=${byKey}
            ></wt-task-group>`
        )}
    </div>`
  }
}
