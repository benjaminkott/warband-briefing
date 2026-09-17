import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TranslationKey, Translator } from '../../../shared/i18n'
import { WtElement } from '../element'
import { HostDisplay } from '../enums/hostDisplay'
import { FactionSide, isFactionSide } from '../enums/factionSide'

/** The label of each side, translated. */
const FACTION_KEYS: Record<FactionSide, TranslationKey> = {
  [FactionSide.Alliance]: 'faction.alliance',
  [FactionSide.Horde]: 'faction.horde',
  [FactionSide.Neutral]: 'faction.neutral'
}

export function factionLabel(tr: Translator, faction: string | null): string | null {
  if (!faction) return null
  return isFactionSide(faction) ? tr.t(FACTION_KEYS[faction]) : faction
}

/** A faction's name behind a dot in its colour; nothing at all for an unknown one. */
@customElement('wt-faction-tag')
export class WtFactionTag extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property() accessor faction: string | null = null

  protected override willUpdate(): void {
    const side = isFactionSide(this.faction) ? this.faction : null
    const label = factionLabel(this.tr, this.faction)
    // The token doubles as the colour class, in lower case.
    this.hostClasses({
      'faction-tag': Boolean(label),
      alliance: side === FactionSide.Alliance,
      horde: side === FactionSide.Horde,
      neutral: side === FactionSide.Neutral
    })
    // An unknown faction is no tag at all, not an empty one taking a gap.
    this.hostPresent(Boolean(label))
  }

  protected override render(): TemplateResult | typeof nothing {
    const label = factionLabel(this.tr, this.faction)
    if (!label) return nothing
    return html`<span class="faction-dot" aria-hidden="true"></span>${label}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-faction-tag': WtFactionTag
  }
}
