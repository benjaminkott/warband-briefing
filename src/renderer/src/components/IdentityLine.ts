import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../shared/types'
import { WtElement, type Content } from '../element'
import './FactionTag'
import './GuildTag'

/**
 * The line under a character's name: spec, class, realm and whatever else
 * the view wants there, with the faction and the guild after them - every
 * entry behind the same dot. The card and the character page both set it,
 * in different orders, so only the entries come from outside; the view's own
 * type size rides on the host's class.
 */
@customElement('wt-identity-line')
export class WtIdentityLine extends WtElement {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** The words before the faction; empty ones are dropped. */
  @property({ attribute: false }) accessor parts: Array<string | null | undefined> = []
  /** Entries after the guild, each already a template. */
  @property({ attribute: false }) accessor extra: Content[] = []

  protected override willUpdate(): void {
    this.hostClasses({ 'identity-line': true })
  }

  protected override render(): TemplateResult {
    const { character } = this
    const entries: Content[] = [html`<span>${this.parts.filter(Boolean).join(' · ')}</span>`]
    if (character.faction) entries.push(html`<wt-faction-tag faction=${character.faction}></wt-faction-tag>`)
    if (character.guild) entries.push(html`<wt-guild-tag guild=${character.guild}></wt-guild-tag>`)
    entries.push(...this.extra)

    // Position is identity here: the entries never reorder.
    return html`${entries.map((entry, index) => html`${index > 0 ? html`<span class="identity-sep">·</span>` : nothing}${entry}`)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-identity-line': WtIdentityLine
  }
}
