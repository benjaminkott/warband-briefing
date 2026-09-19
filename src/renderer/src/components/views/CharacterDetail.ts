import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterPoint, CharacterSnapshot, Goal, SeasonDungeon } from '../../../../shared/types'
import type { CustomTaskState } from '../../../../shared/customTasks'
import { trend } from '../../../../shared/charHistory'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'
import { characterState, goalChip, weeklyProgress, type CharacterState, type WeeklyProgress } from '../../model/overview'
import { WtElement, type WtEvent } from '../../element'
import { Region } from '../../../../shared/enums/region'
import { ControlSize } from '../../enums/controlSize'
import { Command } from '../../enums/command'
import { bindingOf, keysOf } from '../../model/shortcuts'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import { GoldRange } from '../../enums/goldRange'
import { characterGold } from '../../model/gold'
import { DetailSection } from '../../enums/detailSection'
import { DETAIL_SECTIONS } from '../detail/model'
import type { TranslationKey } from '../../../../shared/i18n'
import '../ui/Card'
import '../ui/Chip'
import '../vault/VaultBlock'
import '../detail/DetailBags'
import '../detail/DetailSupplies'
import '../detail/DetailBests'
import '../detail/DetailCurrencies'
import '../detail/DetailFigure'
import '../detail/DetailGear'
import '../detail/DetailHero'
import '../detail/DetailLockouts'
import '../detail/DetailPanel'
import '../detail/DetailProfessions'
import '../detail/DetailRaids'
import '../detail/DetailRuns'
import '../detail/DetailTasks'
import '../ui/Button'
import '../ui/Segmented'
import '../ui/Chips'
import '../ui/PanelEmpty'

/** Far enough back to hold every reading the history file can keep. */
const ALL_DAYS = 10 * 365

/**
 * One character, in full.
 *
 * The card answers "what is still open this week" in a glance and has to fit
 * beside a dozen others; this page has the whole window for one character, so
 * it gets what the card only hints at in tooltips - every run, every slot,
 * every boss - and what the card leaves out altogether: the season's bests,
 * the whole history of the two headline figures, and where the data came from.
 * The panels live in `detail/`, one element per file; this element is the
 * page's order: the hero band always, and under it one section of panels at a
 * time behind a sub-navigation (`DETAIL_SECTIONS`). The shell keeps the open
 * section, so it is the same from one character to the next.
 *
 * @fires wt-detail-section - A section picked.
 * @fires wt-back - The back button, or Escape.
 * @fires wt-prev - The previous character in the list the page was opened from.
 * @fires wt-next - The next one; both are disabled at either end.
 */
@customElement('wt-character-detail')
export class WtCharacterDetail extends WtElement {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ attribute: false }) accessor history: CharacterPoint[] | undefined = undefined
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  @property({ attribute: false }) accessor goals: Goal[] = []
  /** The season's dungeons; the bests panel lists the ones never run. */
  @property({ attribute: false }) accessor dungeons: SeasonDungeon[] = []
  /** The user's own chores and their ticks, for the task panel. */
  @property({ attribute: false }) accessor custom: CustomTaskState | null = null
  /** The player's own minimums of the supplies, for the task panel and the supplies panel. */
  @property({ attribute: false }) accessor supplyMinimums: AppConfig['supplyMinimums'] = {}
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  @property() accessor region: Region = Region.Eu
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false
  @property({ attribute: false }) accessor trackedCurrencies: Set<number> = new Set()
  /** Whether there is a neighbour to step to; absent at either end. */
  @property({ type: Boolean, attribute: 'has-prev' }) accessor hasPrev = false
  @property({ type: Boolean, attribute: 'has-next' }) accessor hasNext = false
  @property() accessor section: DetailSection = DetailSection.Week
  /** The place's search text, from the top bar; the inventory narrows by it. */
  @property() accessor query = ''

  // The keyboard walks the roster the way the buttons do; Escape is the
  // back button. The table in shortcuts.ts holds the keys: a field that has
  // the focus keeps its own, and an arrow with Alt is the shell's.
  private onWindowKey = (event: KeyboardEvent): void => {
    const command = bindingOf(event)?.command
    if (command === Command.ClosePage) this.emit('wt-back')
    else if (command === Command.PrevCharacter && this.hasPrev) this.emit('wt-prev')
    else if (command === Command.NextCharacter && this.hasNext) this.emit('wt-next')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('keydown', this.onWindowKey)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onWindowKey)
  }

  protected override firstUpdated(): void {
    // A page starts at its top. The shell keys this element per character,
    // so the same goes for stepping to the neighbour - without this the next
    // character would open wherever the last one was scrolled to.
    this.parentElement?.scrollTo({ top: 0 })
  }

  protected override willUpdate(): void {
    this.hostClasses({ detail: true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { character, flags, goals, region, showAccount } = this

    const progress = weeklyProgress(character, goals, flags)
    const state = characterState(character, this.maxLevel, this.resetAt)

    return html`
      <div class="detail-nav">
        <wt-button
          icon="arrowLeft"
          label=${tr.t('detail.back')}
          data-tip=${tr.t('detail.backHint', { keys: keysOf(Command.ClosePage, tr) })}
          @click=${() => this.emit('wt-back')}
        ></wt-button>
        <div class="spacer"></div>
        <wt-button
          icon="chevronLeft"
          icon-only
          size=${ControlSize.Sm}
          ?disabled=${!this.hasPrev}
          data-tip=${tr.t('detail.prev', { keys: keysOf(Command.PrevCharacter, tr) })}
          @click=${() => this.emit('wt-prev')}
        ></wt-button>
        <wt-button
          icon="chevronRight"
          icon-only
          size=${ControlSize.Sm}
          ?disabled=${!this.hasNext}
          data-tip=${tr.t('detail.next', { keys: keysOf(Command.NextCharacter, tr) })}
          @click=${() => this.emit('wt-next')}
        ></wt-button>
      </div>

      <wt-detail-hero
        .character=${character}
        .state=${state}
        ?done=${progress.done}
        region=${region}
        ?show-account=${showAccount}
      ></wt-detail-hero>

      <wt-segmented
        .value=${this.section}
        .options=${DETAIL_SECTIONS.map((entry) => ({
          value: entry.id,
          icon: entry.icon,
          label: tr.t(`detail.section.${entry.id}` as TranslationKey)
        }))}
        @wt-change=${(event: WtEvent<'wt-change'>) => {
          event.stopPropagation()
          this.emit('wt-detail-section', event.detail as DetailSection)
        }}
      ></wt-segmented>

      <div class="detail-grid">${this.panels(state, progress)}</div>
    `
  }

  /** The panels of the open section, each row of the grid full. */
  private panels(state: CharacterState, progress: WeeklyProgress): TemplateResult {
    const tr = this.tr
    const { character, flags, goals, trackedCurrencies } = this
    switch (this.section) {
      case DetailSection.Week:
        return html`
          ${
            state.levelling
              ? html`<wt-detail-panel
                  icon="vault"
                  heading=${tr.t('card.vault')}
                  .content=${html`<wt-panel-empty text=${tr.t('card.levellingHint')}></wt-panel-empty>`}
                ></wt-detail-panel>`
              : html`<wt-card class="panel dash-panel dash-c6 dash-fit">
                  <wt-vault-block .character=${character} .progress=${progress} ?unclaimed=${state.unclaimed}></wt-vault-block>
                  ${
                    progress.goals.length > 0 && !character.stale
                      ? html`<wt-chips class="goal-strip">
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
                        </wt-chips>`
                      : nothing
                  }
                </wt-card>`
          }
          <wt-detail-tasks
            .character=${character}
            .goals=${goals}
            .maxLevel=${this.maxLevel}
            .resetAt=${this.resetAt}
            .flags=${flags}
            .custom=${this.custom}
            .supplyMinimums=${this.supplyMinimums}
            beside-vault
          ></wt-detail-tasks>
          <wt-detail-runs .runs=${character.mythicRuns}></wt-detail-runs>
          <wt-detail-lockouts .lockouts=${character.lockouts}></wt-detail-lockouts>
        `
      case DetailSection.Season: {
        const now = this.clock
        const ilvlSeries = trend(this.history, (point) => point.itemLevel, ALL_DAYS, now)
        const ratingSeries = trend(this.history, (point) => point.rating, ALL_DAYS, now)
        const goldSeries = characterGold(this.history, GoldRange.All, now)
        return html`
          <wt-detail-figure
            icon="target"
            heading=${tr.t('detail.ilvlHistory')}
            .value=${character.itemLevel}
            .series=${ilvlSeries}
            tone=${Tint.Accent}
            span="4"
          ></wt-detail-figure>
          <wt-detail-figure
            icon="keystone"
            heading=${tr.t('detail.ratingHistory')}
            .value=${character.mythicRating}
            .series=${ratingSeries}
            tone=${Tint.Key}
            span="4"
          ></wt-detail-figure>
          <wt-detail-figure
            icon="coins"
            heading=${tr.t('detail.goldHistory')}
            .value=${character.money}
            .series=${goldSeries}
            tone=${Tint.Gold}
            kind=${FormatKind.Gold}
            span="4"
          ></wt-detail-figure>
          <wt-detail-bests .bests=${character.dungeonBests ?? []} .dungeons=${this.dungeons}></wt-detail-bests>
          <wt-detail-raids .raids=${character.raidProgress ?? []}></wt-detail-raids>
        `
      }
      case DetailSection.Gear:
        return html`<wt-detail-gear .character=${character} .flags=${flags}></wt-detail-gear>`
      case DetailSection.Professions:
        return html`<wt-detail-professions .character=${character}></wt-detail-professions>`
      case DetailSection.Inventory:
        return html`
          <wt-detail-currencies .character=${character} .tracked=${trackedCurrencies}></wt-detail-currencies>
          <wt-detail-supplies .character=${character} .minimums=${this.supplyMinimums}></wt-detail-supplies>
          <wt-detail-bags .character=${character} query=${this.query}></wt-detail-bags>
        `
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-character-detail': WtCharacterDetail
  }
}
