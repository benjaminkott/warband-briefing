import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { DISPLAY_DEFAULTS } from '../../../../shared/display'
import { goalChip, weeklyProgress } from '../../model/overview'
import { ALT_UNCLAIMED, BETWEEN_WEEKS, CONFIG, MAIN, translatorFor } from '../../stories/fixtures'
import { VaultCategory } from '../../../../shared/enums/vaultCategory'
import '../ui/Card'
import '../ui/Chip'
import './VaultBlock'
import '../ui/Chips'
import './GapNote'
import './VaultRowLabel'
import './ClaimNote'
import './VaultSlot'

const meta: Meta = {
  title: 'Vault/VaultBlock',
  component: 'wt-vault-block'
}

export default meta

/** The vault as the character page draws it: heading, bar, three rows of tiles. */
export const MidWeek: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const progress = weeklyProgress(MAIN, CONFIG.goals, DISPLAY_DEFAULTS)
    return html`<wt-card class="panel dash-panel" style="max-width: 560px">
      <wt-vault-block .character=${MAIN} .progress=${progress}></wt-vault-block>
      <wt-chips class="goal-strip">
        ${progress.goals.map((goal) => {
          const chip = goalChip(tr, goal)
          return html`<wt-chip
            tone=${chip.tone ?? nothing}
            icon=${chip.icon ?? nothing}
            label=${chip.label}
            note=${chip.note ?? nothing}
            ?numeric-note=${chip.numericNote}
            data-tip=${chip.tip ?? nothing}
          ></wt-chip>`
        })}
      </wt-chips>
    </wt-card>`
  }
}

/** Last week's reward still inside: the note instead of nine empty slots. */
export const Unclaimed: StoryObj = {
  render: () =>
    html`<wt-card class="panel dash-panel" style="max-width: 560px">
      <wt-vault-block
        .character=${ALT_UNCLAIMED}
        .progress=${weeklyProgress(ALT_UNCLAIMED, CONFIG.goals, DISPLAY_DEFAULTS)}
        unclaimed
      ></wt-vault-block>
    </wt-card>`
}

/** Last week's rows, on a character not played since the reset: no gap notes. */
export const LastWeek: StoryObj = {
  render: () =>
    html`<wt-card class="panel dash-panel" style="max-width: 560px">
      <wt-vault-block
        .character=${BETWEEN_WEEKS}
        .progress=${weeklyProgress(BETWEEN_WEEKS, CONFIG.goals, DISPLAY_DEFAULTS)}
      ></wt-vault-block>
    </wt-card>`
}

/** The small parts the card borrows: the row label, the gap note, the claim note, one slot tile. */
export const Parts: StoryObj = {
  render: () => {
    const progress = weeklyProgress(MAIN, CONFIG.goals, DISPLAY_DEFAULTS)
    return html`<div style="display: flex; flex-direction: column; gap: var(--s3); align-items: flex-start">
      ${progress.vaultRows.map(
        (row) =>
          html`<wt-vault-row-label
            class="vault-row-label"
            .row=${{ ...row, derived: row.category === VaultCategory.Dungeon }}
            with-icon
          ></wt-vault-row-label>`
      )}
      <wt-gap-note category=${VaultCategory.Raid} missing="2"></wt-gap-note>
      <wt-gap-note class="vault-note" category=${VaultCategory.Dungeon} missing="4"></wt-gap-note>
      <wt-claim-note></wt-claim-note>
      <div class="vault-slots" style="max-width: 360px">
        ${progress.vaultRows[1]!.slots.map((slot) => html`<wt-vault-slot .vaultSlot=${slot} category=${VaultCategory.Dungeon}></wt-vault-slot>`)}
      </div>
    </div>`
  }
}
