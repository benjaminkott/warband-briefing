import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../shared/types'
import { WtElement } from '../element'
import { hasClassGlyph } from './ClassGlyph'
import { HostDisplay } from '../enums/hostDisplay'
import { classAbbr, classColor } from '../enums/classToken'
import { IconKind } from '../../../shared/enums/iconKind'
import './GameIcon'

/**
 * The character's class, as a round medallion.
 *
 * The mark is the character's own face, as Blizzard's host renders it by
 * the id the companion wrote; under it the game's class icon, fetched once
 * by the class token; under that our own drawing (`icons.ts` in main; the
 * app ships no game art). Each shows until the one over it is there, or
 * where that never comes - a character the host has not rendered, no net,
 * the setting off. An unknown class token falls back to the abbreviation,
 * so a future class still renders something sensible.
 */
@customElement('wt-class-medallion')
export class WtClassMedallion extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ type: Number }) accessor size = 40

  protected override willUpdate(): void {
    const token = this.character.classToken
    this.hostClasses({ medallion: true, 'medallion-art': hasClassGlyph(token) })
    this.hostTip(this.character.className)
    this.style.width = `${this.size}px`
    this.style.height = `${this.size}px`
    this.style.fontSize = `${Math.round(this.size * 0.32)}px`
    this.hostVar('--medallion-color', classColor(token) ?? 'var(--text-dim)')
  }

  protected override render(): TemplateResult {
    const token = this.character.classToken
    return html`${
        hasClassGlyph(token)
          ? html`<wt-class-glyph token=${token} size=${this.size}></wt-class-glyph>`
          : classAbbr(token, this.character.className)
      }<wt-game-icon kind=${IconKind.Class} ref=${token ?? ''} size=${this.size}></wt-game-icon
      ><wt-game-icon kind=${IconKind.Portrait} ref=${this.character.key} size=${this.size}></wt-game-icon>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-class-medallion': WtClassMedallion
  }
}
