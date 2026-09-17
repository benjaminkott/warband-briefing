import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../shared/types'
import { formatPlayed } from '../model/overview'
import { untilReset } from '../model/format'
import { WtElement, type Content } from '../element'
import type { IconName } from './Icon'
import './Icon'
import { IconSize } from '../enums/iconSize'

interface MetaEntry {
  icon: IconName
  text: string
  tip?: string
  /** Worth a glance - a bag nearly full. */
  warn?: boolean
}

/**
 * Where the character is and what sits in its bags: played time, the zone it
 * logged out in, auctions running, mail waiting, bag space. The character
 * page lists them from this one reading of the snapshot; `detailed` spells
 * out what a shorter line keeps in tooltips. The view's own spacing rides
 * on the host's class.
 */
@customElement('wt-meta-line')
export class WtMetaLine extends WtElement {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** The page has room for the sentence; the card keeps it in the tooltip. */
  @property({ type: Boolean }) accessor detailed = false
  /** What comes before the entries - the page puts "last seen" first. */
  @property({ attribute: false }) accessor lead: Content = nothing
  /** What follows them. */
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ 'meta-line': true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const character = this.character
    const detailed = this.detailed
    const now = this.clock
    const played = formatPlayed(tr, character.playedTotal)

    const entries: MetaEntry[] = []
    if (played)
      entries.push({
        icon: 'clock',
        text: played,
        tip: tr.t('card.playedHint', {
          level: character.level,
          time: formatPlayed(tr, character.playedLevel) ?? played
        })
      })
    if (character.zone) {
      const lastBoss = character.lastActivity
        ? tr.t('card.lastBoss', {
            name: character.lastActivity.name,
            time: this.relativeTime(character.lastActivity.at)
          })
        : null
      entries.push({
        icon: 'globe',
        text: character.zone,
        tip: [tr.t('card.zoneHint', { zone: character.zone }), detailed ? null : lastBoss].filter(Boolean).join('\n')
      })
      if (detailed && lastBoss) entries.push({ icon: 'raid', text: lastBoss })
    }
    if (character.auctions && character.auctions.count > 0)
      entries.push({
        icon: 'gavel',
        text: tr.plural('card.auctions', character.auctions.count),
        tip: character.auctions.nextExpiresAt
          ? character.auctions.nextExpiresAt > now
            ? tr.t('card.auctionsExpire', {
                time: untilReset(tr, character.auctions.nextExpiresAt) ?? ''
              })
            : tr.t('card.auctionsExpired')
          : undefined
      })
    if (character.mailCount !== null && character.mailCount > 0)
      entries.push({ icon: 'mail', text: tr.plural('card.mail', character.mailCount) })
    if (character.bagSpace)
      entries.push({
        icon: 'bag',
        text: detailed
          ? tr.t('card.bagsHint', { free: character.bagSpace.free, total: character.bagSpace.total })
          : tr.t('card.bags', { free: character.bagSpace.free }),
        tip: tr.t('card.bagsHint', { free: character.bagSpace.free, total: character.bagSpace.total }),
        warn: character.bagSpace.free <= 5
      })

    return html`
      ${this.lead}
      ${entries.map(
        (entry) =>
          html`<span class=${entry.warn ? 'warn-text' : nothing} data-tip=${entry.tip ?? nothing}>
            <wt-icon name=${entry.icon} size=${IconSize.Sm}></wt-icon>${entry.text}
          </span>`
      )}
      ${this.content}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-meta-line': WtMetaLine
  }
}
