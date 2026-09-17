import { html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot, Goal } from '../../../../shared/types'
import { multiRealm } from '../../model/overview'
import { GOAL_LABEL_KEYS } from '../../model/labels'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { withGoal } from './model'
import { GoalKind } from '../../../../shared/enums/goalKind'
import { ControlSize } from '../../enums/controlSize'
import { InputWidth } from '../../enums/inputWidth'
import { Severity } from '../../enums/severity'
import '../ui/Select'
import '../ui/Button'
import '../ui/Input'
import '../ui/Table'
import '../ui/Row'
import '../ui/Cell'

/** Goal kinds, in the order they are worth offering. */
const GOAL_KINDS: GoalKind[] = [
  GoalKind.VaultSlots,
  GoalKind.VaultRaid,
  GoalKind.VaultDungeon,
  GoalKind.VaultWorld,
  GoalKind.MythicRuns,
  GoalKind.RaidBosses
]

/**
 * The weekly targets the characters are measured against: for everyone, or
 * for one character, who is then measured against its own and not the
 * common one. With one character on the roster there is nobody to tell
 * apart, so the choice is not offered.
 *
 * @fires wt-config - The goal list, whenever it changes.
 */
@customElement('wt-settings-goals')
export class WtSettingsGoals extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  /** The roster, so a goal can be set for one character. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []

  @state() accessor goalKind: GoalKind = GoalKind.VaultSlots
  @state() accessor goalTarget = '3'
  /** The character the next goal is for; empty for everyone. */
  @state() accessor goalFor = ''

  private get goals(): Goal[] {
    return this.config.goals ?? []
  }

  private add(): void {
    const character = this.characters.some((each) => each.key === this.goalFor) ? this.goalFor : null
    const next = withGoal(this.goals, this.goalKind, Number(this.goalTarget), character)
    if (next) this.emit('wt-config', { goals: next })
  }

  /** Whom a goal is for, in words: the character's name, or "all characters". */
  private whose(goal: Goal, showRealm: boolean): string {
    const tr = this.tr
    if (goal.characters === undefined) return tr.t('settings.goals.everyone')
    return goal.characters
      .map((key) => {
        const character = this.characters.find((each) => each.key === key)
        return character ? (showRealm ? `${character.name} · ${character.realm}` : character.name) : key
      })
      .join(', ')
  }

  protected override willUpdate(): void {
    const tr = this.tr
    const goals = this.goals
    const roster = [...this.characters].sort((a, b) => tr.compare(a.name, b.name))
    const showRealm = multiRealm(roster)
    const perCharacter = roster.length > 1
    this.icon = 'flag'
    this.heading = tr.t('settings.goals.title')
    this.description = tr.t(perCharacter ? 'settings.goals.bodyRoster' : 'settings.goals.body')
    this.content = html`
      ${
        goals.length > 0
          ? html`<wt-table>
              ${goals.map(
                (goal) =>
                  html`<wt-row>
                    <wt-cell>${tr.t(GOAL_LABEL_KEYS[goal.kind])}</wt-cell>
                    <wt-cell class="num">${tr.t('settings.goals.target', { target: goal.target })}</wt-cell>
                    <wt-cell class=${goal.characters === undefined ? 'faint' : ''}
                      >${perCharacter || goal.characters !== undefined ? this.whose(goal, showRealm) : nothing}</wt-cell
                    >
                    <wt-cell class="row-action">
                      <wt-button
                        icon="trash"
                        ghost
                        size=${ControlSize.Sm}
                        tone=${Severity.Danger}
                        icon-only
                        data-tip=${tr.t('settings.goals.remove')}
                        @click=${() => this.emit('wt-config', { goals: goals.filter((g) => g.id !== goal.id) })}
                      ></wt-button>
                    </wt-cell>
                  </wt-row>`
              )}
            </wt-table>`
          : nothing
      }

      <div class="row">
        <wt-select
          class="input-grow"
          .value=${this.goalKind}
          .options=${GOAL_KINDS.map((kind) => ({ value: kind, label: tr.t(GOAL_LABEL_KEYS[kind]) }))}
          @wt-change=${(event: WtEvent<'wt-change'>) => (this.goalKind = event.detail as GoalKind)}
        ></wt-select>
        <wt-input
          width=${InputWidth.Tiny}
          digits
          .value=${this.goalTarget}
          @wt-input=${(event: WtEvent<'wt-input'>) => (this.goalTarget = event.detail)}
          @wt-submit=${() => this.add()}
        ></wt-input>
        ${
          perCharacter
            ? html`<wt-select
                .value=${this.goalFor}
                control-tip=${tr.t('settings.goals.forHint')}
                .options=${[
                  { value: '', label: tr.t('settings.goals.everyone') },
                  ...roster.map((character) => ({
                    value: character.key,
                    label: showRealm ? `${character.name} · ${character.realm}` : character.name
                  }))
                ]}
                @wt-change=${(event: WtEvent<'wt-change'>) => (this.goalFor = event.detail)}
              ></wt-select>`
            : nothing
        }
        <wt-button icon="plus" label=${tr.t('settings.goals.add')} ?disabled=${!this.goalTarget} @click=${() => this.add()}></wt-button>
      </div>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-goals': WtSettingsGoals
  }
}
