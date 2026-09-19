import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, type TemplateResult } from 'lit'
import { Region } from '../../../../shared/enums/region'
import { trend } from '../../../../shared/charHistory'
import { displayFlags } from '../../../../shared/display'
import { characterState, weeklyProgress } from '../../model/overview'
import {
  ALT_UNCLAIMED,
  CHAR_HISTORY,
  CONFIG,
  LEVELLING,
  MAIN,
  MAX_LEVEL,
  NOW,
  RESET_AT,
  SEASON_DUNGEONS,
  translatorFor
} from '../../stories/fixtures'
import { StatKind } from '../../enums/statKind'
import { DetailListKind } from '../../enums/detailListKind'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import { GoldRange } from '../../enums/goldRange'
import { characterGold } from '../../model/gold'
import './DetailBags'
import './DetailBests'
import './DetailCurrencies'
import './DetailList'
import '../ui/Bar'
import './DetailFigure'
import './DetailGear'
import './DetailHero'
import './DetailLockouts'
import './DetailPanel'
import './DetailProfessions'
import './RunResult'
import './DetailRaids'
import './DetailRuns'
import './DetailSupplies'
import './DetailTasks'
import '../StatTile'
import './DetailEntry'

const flags = displayFlags(CONFIG)
const tracked = new Set(CONFIG.trackedCurrencies)

/** The twelve-column grid the page lays its panels on. */
const grid = (content: TemplateResult) =>
  html`<div class="detail" style="max-width: 1100px"><div class="detail-grid">${content}</div></div>`

const meta: Meta = {
  title: 'Detail/Parts'
}

export default meta

/** The band at the top of the page: who, where last seen, the three figures, the key, the links. */
export const Hero: StoryObj = {
  render: () =>
    html`<div class="detail" style="max-width: 1100px">
      <wt-detail-hero
        .character=${MAIN}
        .state=${characterState(MAIN, MAX_LEVEL, RESET_AT)}
        ?done=${weeklyProgress(MAIN, CONFIG.goals, flags).done}
        region=${Region.Eu}
        show-account
      ></wt-detail-hero>
      <wt-detail-hero .character=${LEVELLING} .state=${characterState(LEVELLING, MAX_LEVEL, RESET_AT)} region=${Region.Eu}></wt-detail-hero>
    </div>`
}

/** The three headline figures with their whole recorded history; and one without any. */
export const Figures: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    return grid(
      html`<wt-detail-figure
          icon="target"
          heading=${tr.t('detail.ilvlHistory')}
          .value=${MAIN.itemLevel}
          .series=${trend(CHAR_HISTORY[MAIN.key], (point) => point.itemLevel, 3650, NOW)}
          tone=${Tint.Accent}
        ></wt-detail-figure>
        <wt-detail-figure
          icon="keystone"
          heading=${tr.t('detail.ratingHistory')}
          .value=${MAIN.mythicRating}
          .series=${trend(CHAR_HISTORY[MAIN.key], (point) => point.rating, 3650, NOW)}
          tone=${Tint.Key}
        ></wt-detail-figure>
        <wt-detail-figure
          icon="coins"
          heading=${tr.t('detail.goldHistory')}
          .value=${MAIN.money}
          .series=${characterGold(CHAR_HISTORY[MAIN.key], GoldRange.All, NOW)}
          tone=${Tint.Gold}
          kind=${FormatKind.Gold}
        ></wt-detail-figure>
        <wt-detail-figure
          icon="target"
          heading=${tr.t('detail.ilvlHistory')}
          .value=${LEVELLING.itemLevel}
          tone=${Tint.Accent}
        ></wt-detail-figure>`
    )
  }
}

/** The season's bests, the dungeons never run at the foot, and this week's runs. */
export const Runs: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-bests .bests=${MAIN.dungeonBests} .dungeons=${SEASON_DUNGEONS}></wt-detail-bests>
        <wt-detail-runs .runs=${MAIN.mythicRuns}></wt-detail-runs>
        <wt-detail-bests .bests=${[]}></wt-detail-bests>
        <wt-detail-runs .runs=${ALT_UNCLAIMED.mythicRuns}></wt-detail-runs>`
    )
}

/** The season's raids: a cell for each difficulty, the bosses in its tooltip; empty without the companion. */
export const Raids: StoryObj = {
  render: () => grid(html`<wt-detail-raids .raids=${MAIN.raidProgress}></wt-detail-raids> <wt-detail-raids .raids=${[]}></wt-detail-raids>`)
}

/** Raids and dungeons together, bosses named where a source knows them. */
export const Lockouts: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-lockouts .lockouts=${MAIN.lockouts}></wt-detail-lockouts><wt-detail-lockouts .lockouts=${[]}></wt-detail-lockouts>`
    )
}

/** Every equipped item, slot by slot, with what it is still missing. */
export const Gear: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-gear .character=${MAIN} .flags=${flags}></wt-detail-gear
        ><wt-detail-gear .character=${LEVELLING} .flags=${flags}></wt-detail-gear>`
    )
}

/** Tasks and currencies: the main's panel as it stands beside the vault block (no vault rows), the levelling character's whole. */
export const TasksAndCurrencies: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-tasks
          .character=${MAIN}
          .goals=${CONFIG.goals}
          .maxLevel=${MAX_LEVEL}
          .resetAt=${RESET_AT}
          .flags=${flags}
          beside-vault
        ></wt-detail-tasks>
        <wt-detail-currencies .character=${MAIN} .tracked=${tracked}></wt-detail-currencies>
        <wt-detail-tasks
          .character=${LEVELLING}
          .goals=${CONFIG.goals}
          .maxLevel=${MAX_LEVEL}
          .resetAt=${RESET_AT}
          .flags=${flags}
        ></wt-detail-tasks>
        <wt-detail-currencies .character=${LEVELLING} .tracked=${tracked}></wt-detail-currencies>`
    )
}

/** The season's consumables against the bags: the main's stock, a minimum of the player's own that leaves it short, a character no bag source knows. */
export const Supplies: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-supplies .character=${MAIN}></wt-detail-supplies>
        <wt-detail-supplies .character=${MAIN} .minimums=${{ flask: 20, potion: 40 }}></wt-detail-supplies>
        <wt-detail-supplies .character=${LEVELLING}></wt-detail-supplies>`
    )
}

/** The bags and the bank with one search over both; an alt with bags alone; a character no bag source knows. */
export const Bags: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-bags .character=${MAIN}></wt-detail-bags>
        <wt-detail-bags .character=${ALT_UNCLAIMED}></wt-detail-bags>
        <wt-detail-bags .character=${LEVELLING}></wt-detail-bags>`
    )
}

/** Professions, for a crafter and for a character without any. */
export const Progress: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-professions .character=${MAIN}></wt-detail-professions>
        <wt-detail-professions .character=${ALT_UNCLAIMED}></wt-detail-professions>`
    )
}

/** The list of a panel in its two cuts: plain lines, and lines that carry a bar. */
export const Lists: StoryObj = {
  render: () =>
    html`<div style="max-width: 320px">
      <wt-detail-list>
        <wt-detail-entry><span>Companion</span><span class="tiny muted">vor 12 Minuten</span></wt-detail-entry>
        <wt-detail-entry><span>SavedInstances</span><span class="tiny muted">vor 2 Stunden</span></wt-detail-entry>
      </wt-detail-list>
      <wt-detail-list kind=${DetailListKind.Bars} style="margin-top: 24px">
        <wt-detail-entry>
          <span class="detail-bar-label">Schneiderei</span>
          <span class="detail-bar-value">100 / 100</span>
          <wt-bar percent="72"></wt-bar>
          <span class="tiny muted">Konzentration 720 / 1000</span>
        </wt-detail-entry>
      </wt-detail-list>
    </div>`
}

/** A run's result, in the colour of which it was. */
export const RunResult: StoryObj = {
  render: () => html`<div style="display: flex; gap: 16px"><wt-run-result timed></wt-run-result><wt-run-result></wt-run-result></div>`
}

/** The bare panel with a span, an aside and nothing else; and the hero's three figures. */
export const Bare: StoryObj = {
  render: () =>
    grid(
      html`<wt-detail-panel span="4" icon="info" heading="Ein Drittel" .content=${html`<p class="muted">4 Spalten</p>`}></wt-detail-panel>
        <wt-detail-panel
          span="6"
          icon="info"
          heading="Die Hälfte"
          aside="1 / 2"
          .content=${html`<p class="muted">6 Spalten</p>`}
        ></wt-detail-panel>
        <wt-detail-panel
          span="12"
          icon="info"
          heading="Die ganze Breite"
          .content=${html`<div class="detail-stats"><wt-stat-tile kind=${StatKind.Cell} icon="target" label="ilvl" .value=${676}></wt-stat-tile><wt-stat-tile kind=${StatKind.Cell} icon="keystone" label="Score" .value=${2841}></wt-stat-tile><wt-stat-tile kind=${StatKind.Cell} icon="coins" label="Gold" .value=${412805}></wt-stat-tile></div>`}
        ></wt-detail-panel>`
    )
}
