import { html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import { customTaskId, type CustomTaskDef } from '../../../../shared/customTasks'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { CustomTaskScope } from '../../../../shared/enums/customTaskScope'
import { ControlSize } from '../../enums/controlSize'
import { InputWidth } from '../../enums/inputWidth'
import { Severity } from '../../enums/severity'
import '../ui/Select'
import '../ui/Button'
import '../ui/FieldGroup'
import '../ui/Input'
import '../ui/Table'
import '../ui/Row'
import '../ui/Cell'

/**
 * The user's own chores: what no source can read, written down once, ticked
 * by hand on the task list. Each one is either every character's or the
 * warband's.
 *
 * @fires wt-config - The list, whenever it changes.
 */
@customElement('wt-settings-custom-tasks')
export class WtSettingsCustomTasks extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig

  @state() accessor label = ''
  @state() accessor scope: CustomTaskScope = CustomTaskScope.Character

  private get defs(): CustomTaskDef[] {
    return this.config.customTasks ?? []
  }

  private add(): void {
    const label = this.label.trim()
    if (!label) return
    this.emit('wt-config', { customTasks: [...this.defs, { id: customTaskId(), label, scope: this.scope }] })
    this.label = ''
  }

  private removeTask(id: string): void {
    // The ticks of a removed chore go with it; the config's prune does the rest.
    const { [id]: _gone, ...ticks } = this.config.customTicks ?? {}
    this.emit('wt-config', { customTasks: this.defs.filter((def) => def.id !== id), customTicks: ticks })
  }

  protected override willUpdate(): void {
    const tr = this.tr
    const defs = this.defs
    const scopeOptions = [
      { value: CustomTaskScope.Character, label: tr.t('settings.customTasks.scope.character') },
      { value: CustomTaskScope.Warband, label: tr.t('settings.customTasks.scope.warband') }
    ]
    this.icon = 'pin'
    this.heading = tr.t('settings.customTasks.title')
    this.description = tr.t('settings.customTasks.body')
    this.content = html`
      ${
        defs.length > 0
          ? html`<wt-table>
              ${defs.map(
                (def) =>
                  html`<wt-row>
                    <wt-cell>${def.label}</wt-cell>
                    <wt-cell class="muted">${tr.t(`settings.customTasks.scope.${def.scope}`)}</wt-cell>
                    <wt-cell class="row-action">
                      <wt-button
                        icon="trash"
                        ghost
                        size=${ControlSize.Sm}
                        tone=${Severity.Danger}
                        icon-only
                        data-tip=${tr.t('settings.customTasks.remove')}
                        @click=${() => this.removeTask(def.id)}
                      ></wt-button>
                    </wt-cell>
                  </wt-row>`
              )}
            </wt-table>`
          : nothing
      }

      <div class="row">
        <wt-input
          width=${InputWidth.Grow}
          control-id="custom-task-label"
          placeholder=${tr.t('settings.customTasks.placeholder')}
          .value=${this.label}
          @wt-input=${(event: WtEvent<'wt-input'>) => (this.label = event.detail)}
          @wt-submit=${() => this.add()}
        ></wt-input>
        <wt-select
          control-id="custom-task-scope"
          .value=${this.scope}
          .options=${scopeOptions}
          @wt-change=${(event: WtEvent<'wt-change'>) => (this.scope = event.detail as CustomTaskScope)}
        ></wt-select>
        <wt-button
          icon="plus"
          label=${tr.t('settings.customTasks.add')}
          ?disabled=${!this.label.trim()}
          @click=${() => this.add()}
        ></wt-button>
      </div>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-custom-tasks': WtSettingsCustomTasks
  }
}
