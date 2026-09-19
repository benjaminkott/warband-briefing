import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classColor } from '../../enums/classToken'
import { styleMap } from 'lit/directives/style-map.js'
import type { TranslationKey } from '../../../../shared/i18n'
import type { CharacterHistory, CharacterSnapshot, GoldPoint, GoldSummary } from '../../../../shared/types'
import { characterLines, countedAccounts, formatGoldShort, goldSeries, goldTrend, perDay, toGold, type GoldSeries } from '../../model/gold'
import { relativeTime } from '../../i18n'
import { multiRealm } from '../../model/overview'
import { timeLabel } from '../StepChart'
import { WtElement, type WtEvent } from '../../element'
import { GOLD_RANGES, GoldRange } from '../../enums/goldRange'
import { GoldChart } from '../../enums/goldChart'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import { ButtonRole } from '../../enums/buttonRole'
import { SettingsSection } from '../../enums/settingsSection'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import '../EmptyState'
import '../ui/DashPanel'
import '../StepChart'
import '../ui/Panel'
import '../ui/Card'
import '../ui/Select'
import '../ShareList'
import '../ClassMedallion'
import '../StatTile'
import '../ui/Button'
import '../ui/FieldGroup'
import '../ui/Format'
import '../ui/Segmented'
import '../Icon'
import '../ShareRow'
import { IconSize } from '../../enums/iconSize'

const RANGE_KEYS: Record<GoldRange, TranslationKey> = {
  [GoldRange.Week]: 'gold.range.7d',
  [GoldRange.Month]: 'gold.range.30d',
  [GoldRange.Quarter]: 'gold.range.90d',
  [GoldRange.All]: 'gold.range.all'
}

const CHART_KEYS: Record<GoldChart, TranslationKey> = {
  [GoldChart.Total]: 'gold.chart.total',
  [GoldChart.Characters]: 'gold.chart.characters'
}

/**
 * The gold tab: what the account owns right now, and how it got there.
 *
 * The overview answers "what is still open this week". Gold is a different
 * question, asked over months rather than days, so it gets a view of its own
 * instead of another tile in a bar built for weekly tasks.
 *
 * @fires wt-account - The account switch, with the folder name or `all`.
 * @fires wt-open-character - A name in the character list, with the character's key.
 * @fires wt-range - The range strip.
 * @fires wt-gold-chart - The chart panel's switch: the account's one line, or one for each character.
 * @fires wt-open-settings - The empty state's button: the setup section, where the gold addons are installed.
 */
@customElement('wt-gold-view')
export class WtGoldView extends WtElement {
  @property({ attribute: false }) accessor gold: GoldSummary | null = null
  @property({ attribute: false }) accessor history: GoldPoint[] = []
  /** Every character's readings; the chart draws the gold in them, one line each. */
  @property({ attribute: false }) accessor charHistory: CharacterHistory = {}
  /**
   * Every character of the selected account, the hidden ones too: the total
   * counts them, so the list must name them or the figures do not add up.
   */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  /** The characters that are off the roster; their rows are dimmed. */
  @property({ attribute: false }) accessor hiddenKeys: Set<string> = new Set()
  @property({ attribute: false }) accessor accounts: string[] = []
  @property() accessor account: string = AnyAccount.All
  @property() accessor range: GoldRange = GoldRange.Month
  @property() accessor chart: GoldChart = GoldChart.Total
  @property({ type: Number, attribute: 'last-sync-at' }) accessor lastSyncAt: number | null = null

  private get total(): number {
    return this.source?.total ?? 0
  }

  // With one account picked, every number here has to describe that account
  // alone - otherwise the total contradicts the characters below it.
  private get source():
    GoldSummary | { total: number; characters: number; warband: number; guilds: Array<{ name: string; money: number }> } | null {
    const scoped = this.account === AnyAccount.All ? null : (this.gold?.byAccount?.find((entry) => entry.account === this.account) ?? null)
    return scoped ?? this.gold
  }

  protected override willUpdate(): void {
    // An empty view is the empty state alone, without the view's own layout.
    this.hostClasses({ 'gold-view': this.total > 0 })
  }

  /** The account's one line over the range, with the count of readings under it. */
  private totalChart(series: GoldSeries | null, history: GoldPoint[]): TemplateResult {
    const tr = this.tr
    // Two readings of the same amount are still a flat line worth drawing;
    // a single one is not a history yet. The summary names the start of the
    // window the way the axis does.
    if (!series || history.length < 2) return html`<p class="faint">${tr.t('gold.noHistory')}</p>`
    return html`<wt-step-chart
        .series=${series}
        tone=${Tint.Gold}
        .format=${(value: number) => formatGoldShort(tr, value)}
        label=${tr.t('gold.chart.summary', {
          from: formatGoldShort(tr, series.first),
          to: formatGoldShort(tr, series.last),
          since: timeLabel(tr, series.from, Math.max(1, series.to - series.from))
        })}
      ></wt-step-chart>
      <p class="faint tiny">${tr.plural('gold.readings', series.readings)}</p>`
  }

  /** One line for each character that holds gold, in its class colour, over the same range. */
  private characterChart(holders: CharacterSnapshot[]): TemplateResult {
    const tr = this.tr
    const lines = characterLines(this.charHistory, holders, this.range, this.clock)
    // A line is a change: until an amount moved, every character is a flat
    // line at its one reading, and that is no history yet.
    if (!lines.some((line) => line.series.readings > 1)) return html`<p class="faint">${tr.t('gold.noCharacterHistory')}</p>`
    const from = Math.min(...lines.map((line) => line.series.from))
    const to = Math.max(...lines.map((line) => line.series.to))
    return html`<wt-step-chart
      .lines=${lines}
      tone=${Tint.Gold}
      .format=${(value: number) => formatGoldShort(tr, value)}
      label=${tr.t('gold.chart.lines', { since: timeLabel(tr, from, Math.max(1, to - from)) })}
    ></wt-step-chart>`
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { gold, history, characters, accounts, account, range } = this
    const source = this.source
    const total = this.total
    const guildTotal = (source?.guilds ?? []).reduce((sum, guild) => sum + guild.money, 0)

    const series = goldSeries(history, account, range, countedAccounts(gold))
    // Every character that holds gold, the richest first: the reader looks
    // for where the gold is, and a cut list would hide part of the total.
    const holders = [...characters].filter((character) => (character.money ?? 0) > 0).sort((a, b) => (b.money ?? 0) - (a.money ?? 0))
    const showRealm = multiRealm(holders)
    // The characters' share is of what the characters hold, not of the
    // whole: beside a warband bank with half the gold every character
    // would be a sliver, and the list is there to tell them apart.
    const held = holders.reduce((sum, character) => sum + (character.money ?? 0), 0)

    if (total === 0) {
      return html`<wt-empty-state
        icon="coins"
        heading=${tr.t('gold.empty.title')}
        .content=${html`<p>${tr.t('gold.empty.body')}</p>
          <div class="row">
            <wt-button
              icon="settings"
              tone=${ButtonRole.Primary}
              label=${tr.t('settings.sources.open')}
              @click=${() => this.emit('wt-open-settings', SettingsSection.Setup)}
            ></wt-button>
          </div>`}
      ></wt-empty-state>`
    }

    const parts = [
      { key: 'characters', label: tr.t('gold.characters'), value: source?.characters ?? 0 },
      { key: 'warband', label: tr.t('gold.warband'), value: source?.warband ?? 0 },
      ...(source?.guilds ?? []).map((guild) => ({ key: `guild:${guild.name}`, label: guild.name, value: guild.money }))
    ].filter((part) => part.value > 0)

    return html`
      <div class="view-bar">
        <div class="view-title">
          <wt-icon name="coins" size=${IconSize.Md}></wt-icon>
          <h2>${tr.t('gold.title')}</h2>
        </div>

        ${
          accounts.length > 1
            ? html`<wt-field-group inline icon="users" label=${tr.t('overview.account')}>
                <wt-select
                  .value=${account}
                  .options=${[
                    { value: AnyAccount.All, label: tr.t('overview.account.all') },
                    ...accounts.map((name) => ({ value: name, label: name }))
                  ]}
                  @wt-change=${(event: WtEvent<'wt-change'>) => {
                    event.stopPropagation()
                    this.emit('wt-account', event.detail)
                  }}
                ></wt-select>
              </wt-field-group>`
            : nothing
        }

        <wt-segmented
          .value=${range}
          .options=${GOLD_RANGES.map((entry) => ({ value: entry, label: tr.t(RANGE_KEYS[entry]) }))}
          @wt-change=${(event: WtEvent<'wt-change'>) => {
            event.stopPropagation()
            this.emit('wt-range', event.detail as GoldRange)
          }}
        ></wt-segmented>

        <span class="muted tiny last-read"
          ><wt-icon name="clock" size=${IconSize.Xs}></wt-icon>${tr.t('overview.lastRead', {
            time: this.lastSyncAt ? relativeTime(tr, this.lastSyncAt, this.clock) : tr.t('overview.never')
          })}</span
        >
      </div>

      <div class="summary-bar">
        <wt-stat-tile
          icon="coins"
          .label=${tr.t('gold.unit')}
          .value=${toGold(total)}
          .trend=${goldTrend(series)}
          tone=${Tint.Gold}
        ></wt-stat-tile>
        <wt-stat-tile
          icon="calendar"
          .label=${tr.t('gold.perDay')}
          .value=${series ? Math.round(perDay(series)) : '—'}
          tone=${Tint.Gold}
        ></wt-stat-tile>
        <wt-stat-tile
          icon="star"
          .label=${tr.t('gold.high')}
          .value=${series ? series.max : '—'}
          .foot=${`${tr.t('gold.low')}: ${series ? tr.formatNumber(series.min) : '—'}`}
          tone=${Tint.Gold}
        ></wt-stat-tile>
      </div>

      <wt-card class="panel gold-panel">
        <div class="panel-head">
          <span class="panel-step"><wt-icon name="gauge" size=${IconSize.Md}></wt-icon></span>
          <h2>${tr.t('gold.chart.title')}</h2>
          <wt-segmented
            class="panel-head-control"
            .value=${this.chart}
            .options=${Object.values(GoldChart).map((entry) => ({ value: entry, label: tr.t(CHART_KEYS[entry]) }))}
            @wt-change=${(event: WtEvent<'wt-change'>) => {
              event.stopPropagation()
              this.emit('wt-gold-chart', event.detail as GoldChart)
            }}
          ></wt-segmented>
        </div>
        ${this.chart === GoldChart.Characters ? this.characterChart(holders) : this.totalChart(series, history)}
      </wt-card>

      <div class="gold-split">
        <div class="gold-side">
          <wt-panel icon="vault" heading=${tr.t('gold.breakdown')} class="gold-panel">
            <wt-share-list>
              ${parts.map((part) => html`<wt-share-row value=${part.value} total=${total}>${part.label}</wt-share-row>`)}
            </wt-share-list>
            ${
              guildTotal > 0
                ? html`<p class="faint tiny">
                    ${tr.t('gold.guilds')}: <wt-format kind=${FormatKind.Gold} .value=${guildTotal}></wt-format>
                  </p>`
                : nothing
            }
          </wt-panel>

          ${
            account === AnyAccount.All && (gold?.byAccount.length ?? 0) > 1
              ? html`<wt-panel icon="folder" heading=${tr.t('gold.byAccount')} class="gold-panel">
                  <wt-share-list>
                    ${[...(gold?.byAccount ?? [])]
                      .sort((a, b) => b.total - a.total)
                      .map((entry) => html`<wt-share-row value=${entry.total} total=${total}>${entry.account}</wt-share-row>`)}
                  </wt-share-list>
                </wt-panel>`
              : nothing
          }
        </div>

        <wt-panel icon="users" heading=${tr.t('gold.byCharacter')} class="gold-panel">
          ${
            holders.length === 0
              ? html`<p class="faint">${tr.t('gold.noCharacters')}</p>`
              : html`<wt-share-list>
                  ${holders.map((character) => {
                    const off = this.hiddenKeys.has(character.key)
                    // On a single-realm roster the realm is the same word on
                    // every row - noise. A character off the roster says so
                    // in place of its realm: why the row is dim matters more.
                    const note = off ? tr.t('gold.offRoster') : showRealm ? character.realm : null
                    return html`<wt-share-row value=${character.money ?? 0} total=${held} ?off=${off}>
                      <wt-class-medallion .character=${character} size="22"></wt-class-medallion>
                      <wt-button
                        class="char-open"
                        label=${character.name}
                        style=${styleMap({ color: classColor(character.classToken) ?? '' })}
                        data-tip=${tr.t('detail.open')}
                        @click=${() => this.emit('wt-open-character', character.key)}
                      ></wt-button>
                      ${note === null ? nothing : html`<span class="faint tiny">${note}</span>`}
                    </wt-share-row>`
                  })}
                </wt-share-list>`
          }
        </wt-panel>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-gold-view': WtGoldView
  }
}
