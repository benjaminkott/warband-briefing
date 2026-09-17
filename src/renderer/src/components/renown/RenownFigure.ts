import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { FormatKind } from '../../enums/formatKind'
import type { RenownFigure } from '../../model/dashboard'
import { WtElement } from '../../element'
import '../ui/Ring'
import '../ui/Format'

/**
 * One faction of the renown panel: a ring on a plate, filled to the next
 * level or - past the maximum level - to the next paragon reward, the
 * level at the bottom, the faction's initials in the middle where no
 * source supplies a crest. Under it the name, the stage - the level or
 * the rank, "Paragon", or the reward that waits - and the way to the
 * next: what is earned of what it takes. The host is the figure; in
 * paragon it takes the key colour.
 */
@customElement('wt-renown-figure')
export class WtRenownFigure extends WtElement {
  @property({ attribute: false }) accessor figure!: RenownFigure

  protected override willUpdate(): void {
    this.hostClasses({ 'renown-figure': true, paragon: this.figure.paragon })
  }

  protected override render(): TemplateResult {
    const faction = this.figure
    return html`<wt-ring disc size="120" .groups=${[{ percent: faction.percent, label: faction.hint }]} badge=${faction.level}>
        <span class="renown-mark">${faction.initials}</span>
      </wt-ring>
      <span class="renown-name" data-tip=${faction.name}>${faction.name}</span>
      <span
        class=${classMap({ 'renown-stage': true, 'warn-text': faction.rewardPending, faint: faction.paragon && !faction.rewardPending })}
        >${faction.stage}</span
      >
      ${
        faction.current !== null && faction.max !== null
          ? html`<span class="renown-progress num"
              ><wt-format kind=${FormatKind.Number} .value=${faction.current}></wt-format> /
              <wt-format kind=${FormatKind.Number} .value=${faction.max}></wt-format
            ></span>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-renown-figure': WtRenownFigure
  }
}
