import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { DISPLAY_DEFAULTS } from '../../../shared/display'
import { nextStep } from '../model/plan'
import { characterState, weeklyProgress } from '../model/overview'
import { CONFIG, MAX_LEVEL, RESET_AT, ROSTER } from '../stories/fixtures'
import { StepTone } from '../enums/stepTone'
import { DEFAULT_TRANSLATOR } from '../i18n'
import './StepNote'
import { IconSize } from '../enums/iconSize'

const meta: Meta = {
  title: 'Shared/StepNote',
  component: 'wt-step-note'
}

export default meta

/** The step in the default translator's words; the element itself reads the provider's. */
const stepOf = (character: (typeof ROSTER)[number]) =>
  nextStep(
    character,
    weeklyProgress(character, CONFIG.goals, DISPLAY_DEFAULTS),
    characterState(character, MAX_LEVEL, RESET_AT).levelling,
    DEFAULT_TRANSLATOR,
    DISPLAY_DEFAULTS
  )

/** The next step of each character of the fixture roster, as the card band sets it. */
export const Roster: StoryObj = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s2)">
      ${ROSTER.map(
        (character) =>
          html`<div style="display: flex; gap: var(--s4)">
            <span style="width: 8em">${character.name}</span
            ><wt-step-note class="card-step" .step=${stepOf(character)} size=${IconSize.Sm}></wt-step-note>
          </div>`
      )}
    </div>`
}

/** The four tones: a reward to claim, a chore open, the week done, nothing to say. */
export const Tones: StoryObj = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s2)">
      <wt-step-note
        class="card-step"
        .step=${{ text: 'Vault to collect', detail: null, reason: null, tone: StepTone.Claim, icon: 'vault' }}
      ></wt-step-note>
      <wt-step-note
        class="card-step"
        .step=${{ text: '2 more dungeons', detail: 'Dungeons · slot 2 of 3 · reward item level 678, +2', reason: null, tone: StepTone.Open, icon: 'chevronUp' }}
      ></wt-step-note>
      <wt-step-note
        class="card-step"
        .step=${{ text: 'Week done', detail: null, reason: null, tone: StepTone.Done, icon: 'check' }}
      ></wt-step-note>
      <wt-step-note
        class="card-step"
        .step=${{ text: 'Level 74', detail: null, reason: null, tone: StepTone.Quiet, icon: 'chevronUp' }}
      ></wt-step-note>
    </div>`
}

/** On a roster row the reason follows the words in quiet type. */
export const WithDetail: StoryObj = {
  render: () =>
    html`<wt-step-note
      class="todo-step"
      .step=${{ text: '2 more dungeons', detail: 'Dungeons · slot 2 of 3 · reward item level 678, +2', reason: null, tone: StepTone.Open, icon: 'chevronUp' }}
      detail
    ></wt-step-note>`
}
