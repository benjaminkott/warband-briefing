import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { displayFlags } from '../../../../shared/display'
import { activeRoster, dungeonMatrix, rosterRows, weekTotals } from '../../model/dashboard'
import { goldSeries } from '../../model/gold'
import { eveningPlan } from '../../model/plan'
import {
  ALT_UNCLAIMED,
  BETWEEN_WEEKS,
  CONFIG,
  GOLD,
  GOLD_HISTORY,
  MAIN,
  MAX_LEVEL,
  NEXT_RESET_AT,
  RESET_AT,
  ROSTER,
  SEASON_DUNGEONS,
  translatorFor
} from '../../stories/fixtures'
import { vaultRing } from './model'
import { GoldRange } from '../../enums/goldRange'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import './BestMatrix'
import './CharacterTile'
import './EveningPanel'
import './KpiRow'
import './VaultCount'
import '../ClassMedallion'
import '../ClassGlyph'
import '../ui/Ring'

const flags = displayFlags(CONFIG)
const rows = (tr: ReturnType<typeof translatorFor>) => rosterRows(ROSTER, CONFIG.goals, MAX_LEVEL, RESET_AT, tr, flags, SEASON_DUNGEONS)

const meta: Meta = {
  title: 'Dashboard/Parts'
}

export default meta

/** The five figures as the board sums them from the fixture roster. */
export const KpiRow: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const active = activeRoster(ROSTER, MAX_LEVEL)
    return html`<div class="dash">
      <wt-kpi-row
        .totals=${weekTotals(active, CONFIG.goals, flags)}
        active-count=${active.length}
        .goals=${CONFIG.goals}
        .unclaimed=${rows(tr).filter((row) => row.unclaimed)}
        next-reset-at=${NEXT_RESET_AT}
        .gold=${GOLD}
        .series=${goldSeries(GOLD_HISTORY, AnyAccount.All, GoldRange.Month)}
      ></wt-kpi-row>
    </div>`
  }
}

/** The Great Vault in the ring: one group for each row, around the class, in the size of the tile and of the row. */
export const VaultRing: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    return html`<div style="display: flex; gap: var(--s5); align-items: center">
      ${[MAIN, ALT_UNCLAIMED, BETWEEN_WEEKS].map(
        (character) =>
          html`<wt-ring .groups=${vaultRing(tr, character.vault)} size="96">
            <wt-class-medallion .character=${character} size="54"></wt-class-medallion>
          </wt-ring>`
      )}
      <wt-ring .groups=${vaultRing(tr, MAIN.vault)} size="40">
        <wt-class-medallion .character=${MAIN} size="24"></wt-class-medallion>
      </wt-ring>
    </div>`
  }
}

/** The same on a plate, with the count of unlocked slots at the bottom, as the game shows a faction. */
export const VaultRingOnAPlate: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    return html`<div style="display: flex; gap: var(--s5); align-items: center">
      ${[MAIN, ALT_UNCLAIMED, BETWEEN_WEEKS].map(
        (character) =>
          html`<wt-ring
            .groups=${vaultRing(tr, character.vault)}
            size="96"
            disc
            badge=${`${character.vault.reduce((sum, row) => sum + row.unlockedCount, 0)}/9`}
          >
            <wt-class-glyph token=${character.classToken} size="46"></wt-class-glyph>
          </wt-ring>`
      )}
    </div>`
  }
}

/** One character as a tile: the vault as the ring, the class in the middle, the errand at the foot. */
export const Tiles: StoryObj = {
  render: (_args, context) =>
    html`<div class="dash">
      <div class="tile-grid">
        ${rows(translatorFor(context)).map((row) => html`<wt-character-tile .row=${row} show-realm></wt-character-tile>`)}
      </div>
    </div>`
}

/** The evening: the characters worth logging into first, each with its step and the reason in words; a short evening, where the steps that do not fit follow a caption; and the panel with nothing. */
export const Evening: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const flags = displayFlags(CONFIG)
    const rows = rosterRows(ROSTER, CONFIG.goals, MAX_LEVEL, RESET_AT, tr, flags, SEASON_DUNGEONS)
    // Short enough that one character's smallest step does not fit.
    const short = 15
    return html`<div class="dash">
      <wt-evening-panel .plan=${eveningPlan(rows, tr, flags)}></wt-evening-panel>
      <wt-evening-panel .plan=${eveningPlan(rows, tr, flags, short)} budget=${short}></wt-evening-panel>
      <wt-evening-panel></wt-evening-panel>
    </div>`
  }
}

/** The vault count of each character: "7 / 9", or a dash where there is no vault. */
export const VaultCount: StoryObj = {
  render: (_args, context) =>
    html`<div style="display: flex; gap: 24px; flex-wrap: wrap">
      ${rows(translatorFor(context)).map((row) => html`<span class="tile-vault num"><wt-vault-count .row=${row}></wt-vault-count></span>`)}
    </div>`
}

/** The season's bests, one row per character and one column per dungeon of the season, the ones nobody ran as dashes; a heading sorts. */
export const Matrix: StoryObj = {
  render: (_args, context) =>
    html`<div class="dash">
      <wt-best-matrix .matrix=${dungeonMatrix(ROSTER, translatorFor(context), SEASON_DUNGEONS)}></wt-best-matrix>
    </div>`
}
