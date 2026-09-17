import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { ClassToken } from '../enums/classToken'
import warrior from '../../../../assets/class-icons/warrior.svg?url'
import paladin from '../../../../assets/class-icons/paladin.svg?url'
import hunter from '../../../../assets/class-icons/hunter.svg?url'
import rogue from '../../../../assets/class-icons/rogue.svg?url'
import priest from '../../../../assets/class-icons/priest.svg?url'
import shaman from '../../../../assets/class-icons/shaman.svg?url'
import mage from '../../../../assets/class-icons/mage.svg?url'
import warlock from '../../../../assets/class-icons/warlock.svg?url'
import monk from '../../../../assets/class-icons/monk.svg?url'
import druid from '../../../../assets/class-icons/druid.svg?url'
import deathknight from '../../../../assets/class-icons/deathknight.svg?url'
import demonhunter from '../../../../assets/class-icons/demonhunter.svg?url'
import evoker from '../../../../assets/class-icons/evoker.svg?url'

/**
 * The SVG files are the source of truth. Keeping the artwork outside the
 * elements makes the complete icon set usable by the app, docs and design
 * tools alike.
 */
const GLYPHS: Record<ClassToken, string> = {
  [ClassToken.Warrior]: warrior,
  [ClassToken.Paladin]: paladin,
  [ClassToken.Hunter]: hunter,
  [ClassToken.Rogue]: rogue,
  [ClassToken.Priest]: priest,
  [ClassToken.Shaman]: shaman,
  [ClassToken.Mage]: mage,
  [ClassToken.Warlock]: warlock,
  [ClassToken.Monk]: monk,
  [ClassToken.Druid]: druid,
  [ClassToken.DeathKnight]: deathknight,
  [ClassToken.DemonHunter]: demonhunter,
  [ClassToken.Evoker]: evoker
}

/** Whether the set draws the token; a class the app does not know yet is not in it. */
export function hasClassGlyph(token: string | null): token is ClassToken {
  return token !== null && token in GLYPHS
}

/**
 * One class's mark. The host is the `.class-glyph` box; a token the set does
 * not know draws nothing and takes no room, so the medallion can fall back
 * to the abbreviation next to it.
 */
@customElement('wt-class-glyph')
export class WtClassGlyph extends WtElement {
  /** The addon's token; a class the set does not know, or none, draws nothing. */
  @property() accessor token: string | null = null
  /** A length; a bare number is pixels. */
  @property() accessor size: number | string = '1em'

  protected override willUpdate(): void {
    this.hostClasses({ 'class-glyph': true })
    this.hostPresent(hasClassGlyph(this.token))
  }

  protected override render(): TemplateResult | typeof nothing {
    const { token } = this
    if (!hasClassGlyph(token)) return nothing
    return html`<img src=${GLYPHS[token]} width=${this.size} height=${this.size} alt="" aria-hidden="true" />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-class-glyph': WtClassGlyph
  }
}
