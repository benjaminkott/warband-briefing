import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import type { CharacterSnapshot, WarbandBank } from '../../../../shared/types'
import { WtElement, type WtEvent } from '../../element'
import { memoLast } from '../../memo'
import { findHits, flatHits, type Hit, type Hits } from '../../model/search'
import { HitKind } from '../../enums/hitKind'
import { ControlSize } from '../../enums/controlSize'
import { Command } from '../../enums/command'
import { bindingOf, keysOf } from '../../model/shortcuts'
import type { WtInput } from '../ui/Input'
import './SearchHit'
import '../Icon'
import '../ui/Button'
import '../ui/Input'
import { IconSize } from '../../enums/iconSize'

/**
 * The one search of the app, in the top bar: a field, and under it the
 * hits - the characters the words name, the items they name across every
 * bag and bank. The text is the place's (`Place.query`): the view under
 * the bar narrows itself by it where it can, and the list offers the
 * jumps. Enter opens the row the arrow keys stand on, the first when they
 * have not moved; Escape empties the field, then leaves it. The search
 * keys of `shortcuts.ts` jump into the field from anywhere.
 *
 * @fires wt-query - The text, on every keystroke, and empty when cleared.
 * @fires wt-open-hit - A row picked, by Enter or a click.
 */
@customElement('wt-search')
export class WtSearch extends WtElement {
  @property() accessor query = ''
  /** The characters the search goes over: the roster the shell shows. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ attribute: false }) accessor banks: WarbandBank[] = []
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false

  /** The list shows while the field has the focus and there is something typed. */
  @state() private accessor open = false
  /** The row the arrow keys stand on, in the flat order of the list. */
  @state() private accessor active = 0

  private fieldRef = createRef<WtInput>()

  private hitsOf = memoLast((characters: CharacterSnapshot[], banks: WarbandBank[], query: string): Hits =>
    findHits(characters, banks, query)
  )

  private onWindowKey = (event: KeyboardEvent): void => {
    if (bindingOf(event)?.command === Command.Search) {
      event.preventDefault()
      this.fieldRef.value?.focus()
      this.fieldRef.value?.select()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('keydown', this.onWindowKey)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onWindowKey)
  }

  protected override willUpdate(): void {
    this.hostClasses({ search: true })
    // The shell can change the text under the field (a hit opened, a step
    // back): a row the list no longer has is not stood on.
    if (this.active >= flatHits(this.hits).length) this.active = 0
  }

  private get hits(): Hits {
    return this.hitsOf(this.characters, this.banks, this.query)
  }

  private setQuery(query: string): void {
    // A new text is a new list: the arrows start at its top again.
    this.active = 0
    this.emit('wt-query', query)
  }

  private pick(hit: Hit): void {
    this.emit('wt-open-hit', hit)
    this.fieldRef.value?.blur()
  }

  // The arrows walk the list round its ends; Escape clears first, since a
  // typed text is what the player most likely wants gone, and leaves the
  // field when there is nothing left to clear.
  private onFieldKey(event: KeyboardEvent): void {
    const rows = flatHits(this.hits)
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (rows.length === 0) return
        const step = event.key === 'ArrowDown' ? 1 : -1
        this.active = (this.active + step + rows.length) % rows.length
        event.preventDefault()
        break
      }
      case 'Escape':
        if (this.query) this.setQuery('')
        else this.fieldRef.value?.blur()
        event.preventDefault()
        break
      default:
        return
    }
  }

  private onSubmit(event: WtEvent<'wt-submit'>): void {
    event.stopPropagation()
    const hit = flatHits(this.hits)[this.active]
    if (hit) this.pick(hit)
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const hits = this.hits
    const rows = flatHits(hits)
    const listed = this.open && this.query.trim().length > 0
    const at = (hit: Hit): number => rows.indexOf(hit)
    return html`
      <wt-input
        ${ref(this.fieldRef)}
        code
        .value=${this.query}
        placeholder=${tr.t('search.placeholder', { keys: keysOf(Command.Search, tr) })}
        @focusin=${() => (this.open = true)}
        @focusout=${() => (this.open = false)}
        @keydown=${this.onFieldKey}
        @wt-input=${(event: WtEvent<'wt-input'>) => {
          event.stopPropagation()
          this.setQuery(event.detail)
        }}
        @wt-submit=${this.onSubmit}
      ></wt-input>
      <!-- After the input, so the icon can follow the field's own state. -->
      <span class="search-icon"><wt-icon name="search" size=${IconSize.Sm}></wt-icon></span>
      ${
        this.query
          ? html`<wt-button
              icon="close"
              icon-only
              size=${ControlSize.Xs}
              data-tip=${tr.t('search.clear')}
              @click=${() => this.setQuery('')}
            ></wt-button>`
          : nothing
      }
      ${
        listed
          ? // A press on the list must not take the focus off the field, or the
            // list would close under the pointer before the click lands.
            html`<div class="popover search-hits" role="listbox" @mousedown=${(event: MouseEvent) => event.preventDefault()}>
              ${rows.length === 0 ? html`<span class="search-group faint tiny">${tr.t('search.noHits')}</span>` : nothing}
              ${
                hits.characters.length > 0
                  ? html`<span class="search-group muted tiny">${tr.t('search.characters')}</span>${hits.characters.map(
                        (hit) =>
                          html`<wt-search-hit
                            .hit=${hit}
                            ?active=${at(hit) === this.active}
                            @mouseenter=${() => (this.active = at(hit))}
                            @click=${() => this.pick(hit)}
                          ></wt-search-hit>`
                      )}`
                  : nothing
              }
              ${
                hits.items.length > 0
                  ? html`<span class="search-group muted tiny">${tr.t('search.items')}</span>${hits.items.map(
                        (hit) =>
                          html`<wt-search-hit
                            .hit=${hit}
                            ?active=${at(hit) === this.active}
                            ?show-account=${this.showAccount}
                            @mouseenter=${() => (this.active = at(hit))}
                            @click=${() => this.pick(hit)}
                          ></wt-search-hit>`
                      )}`
                  : nothing
              }
              ${hits.more > 0 ? html`<span class="search-group faint tiny">${tr.plural('search.more', hits.more)}</span>` : nothing}
              ${
                rows.length > 0
                  ? html`<span class="search-foot faint tiny"
                      >${tr.t(rows[this.active]?.kind === HitKind.Item ? 'search.open.item' : 'search.open.character')}</span
                    >`
                  : nothing
              }
            </div>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-search': WtSearch
  }
}
