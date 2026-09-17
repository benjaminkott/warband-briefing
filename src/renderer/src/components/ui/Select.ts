import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import { styleMap } from 'lit/directives/style-map.js'
import { classes, WtElement } from '../../element'
import type { IconName } from '../Icon'
import { HostDisplay } from '../../enums/hostDisplay'
import { CONTROL_ICON, ControlSize } from '../../enums/controlSize'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  icon?: IconName
}

/** Where the menu ends up: viewport coordinates, so no ancestor can clip it. */
interface Placement {
  left: number
  top?: number
  bottom?: number
  minWidth: number
  maxHeight: number
}

// The menu's distance to its trigger and to the window's edge: one step
// of the spacing scale (`--s2`), as the popover's own rule has it.
const GAP = 8
const EDGE = 8

/**
 * A dropdown that looks like the rest of the app.
 *
 * The native select paints its own list from the operating system - white on
 * Windows, whatever the platform feels like elsewhere - and no amount of CSS
 * on `option` changes that. So the list is ours: a button that reads like the
 * inputs beside it, and a menu built from the same parts as the other popovers.
 *
 * It keeps the keyboard habits of the control it replaces: arrows move,
 * Enter picks, Escape leaves, Home and End jump to the ends.
 *
 * @fires wt-change - A pick, with the option's value as the detail.
 */
@customElement('wt-select')
export class WtSelect extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property() accessor value = ''
  @property({ attribute: false }) accessor options: SelectOption[] = []
  /** The id the label beside the control points at; it lands on the button. */
  @property({ attribute: 'control-id' }) accessor controlId: string | undefined = undefined
  @property({ attribute: 'control-tip' }) accessor controlTip: string | undefined = undefined
  @property({ type: Boolean }) accessor disabled = false
  /** The height, on the scale the buttons use; the marks follow it. */
  @property() accessor size: ControlSize = ControlSize.Md

  @state() accessor open = false
  @state() accessor active = 0
  @state() accessor box: Placement | null = null

  private triggerRef = createRef<HTMLButtonElement>()
  private menuRef = createRef<HTMLDivElement>()

  // The menu is viewport-positioned, so it has to be told where the button is
  // whenever that could have moved - on open, and on every scroll or resize
  // while it stands open.
  private place = (): void => {
    const trigger = this.triggerRef.value
    const menu = this.menuRef.value
    if (!trigger || !menu) return
    const rect = trigger.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - GAP - EDGE
    const above = rect.top - GAP - EDGE
    // Drop upwards only when the list does not fit below and fits better above.
    const up = menu.scrollHeight > below && above > below
    const width = Math.max(rect.width, menu.offsetWidth)
    this.box = {
      left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE)),
      top: up ? undefined : rect.bottom + GAP,
      bottom: up ? window.innerHeight - rect.top + GAP : undefined,
      minWidth: rect.width,
      maxHeight: Math.max(140, Math.min(320, up ? above : below))
    }
  }

  // A menu that stays open after the click that started elsewhere is a menu in
  // the way.
  private onDocumentDown = (event: MouseEvent): void => {
    const target = event.target as Node
    if (this.menuRef.value?.contains(target) || this.triggerRef.value?.contains(target)) return
    this.open = false
    this.box = null
  }

  private get index(): number {
    return Math.max(
      0,
      this.options.findIndex((option) => option.value === this.value)
    )
  }

  protected override willUpdate(): void {
    this.hostClasses({ select: true })
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('open')) {
      if (this.open) {
        // Placed on the second pass; until then the menu must not flash elsewhere.
        this.place()
        // Capture, so a scroll inside any container carries the menu along too.
        window.addEventListener('scroll', this.place, true)
        window.addEventListener('resize', this.place)
        document.addEventListener('mousedown', this.onDocumentDown)
      } else {
        window.removeEventListener('scroll', this.place, true)
        window.removeEventListener('resize', this.place)
        document.removeEventListener('mousedown', this.onDocumentDown)
      }
    }
    // Keep the highlighted row in sight while the arrows walk past the fold.
    if (this.open && (changed.has('open') || changed.has('active'))) {
      const row = this.menuRef.value?.querySelector(`[data-row="${this.active}"]`)
      row?.scrollIntoView({ block: 'nearest' })
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.place, true)
    window.removeEventListener('resize', this.place)
    document.removeEventListener('mousedown', this.onDocumentDown)
  }

  private start(at?: number): void {
    if (this.disabled) return
    this.active = at ?? this.index
    this.open = true
    // The menu takes the keyboard, so the arrows reach it without a second tab.
    requestAnimationFrame(() => this.menuRef.value?.focus())
  }

  private close(): void {
    this.open = false
    this.box = null
    this.triggerRef.value?.focus()
  }

  private commit(option: SelectOption): void {
    this.emit('wt-change', option.value)
    this.close()
  }

  private onTriggerKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      this.start()
    }
  }

  private onMenuKey(event: KeyboardEvent): void {
    const last = this.options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.active = Math.min(last, this.active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.active = Math.max(0, this.active - 1)
        break
      case 'Home':
        event.preventDefault()
        this.active = 0
        break
      case 'End':
        event.preventDefault()
        this.active = last
        break
      case 'Enter':
      case ' ': {
        event.preventDefault()
        const option = this.options[this.active]
        if (option) this.commit(option)
        break
      }
      case 'Escape':
      case 'Tab':
        event.preventDefault()
        this.close()
        break
      default:
        break
    }
  }

  protected override render(): TemplateResult {
    const selected = this.options[this.index]
    const box = this.box
    const icon = CONTROL_ICON[this.size]
    return html`
      <button
        ${ref(this.triggerRef)}
        id=${this.controlId ?? nothing}
        type="button"
        class=${classes('select-trigger', this.size !== ControlSize.Md && this.size, this.open && 'open')}
        data-tip=${this.controlTip ?? nothing}
        ?disabled=${this.disabled}
        aria-haspopup="listbox"
        aria-expanded=${this.open ? 'true' : 'false'}
        @click=${() => (this.open ? this.close() : this.start())}
        @keydown=${this.onTriggerKey}
      >
        <span class="select-value"
          >${selected?.icon ? html`<wt-icon name=${selected.icon} size=${icon}></wt-icon>` : nothing}${selected?.label ?? ''}</span
        >
        <wt-icon name="chevronDown" size=${icon} class="select-caret"></wt-icon>
      </button>

      ${
        this.open
          ? html`<div
              ${ref(this.menuRef)}
              class="select-menu"
              role="listbox"
              tabindex="-1"
              @keydown=${this.onMenuKey}
              style=${styleMap({
                left: `${box?.left ?? 0}px`,
                top: box?.top !== undefined ? `${box.top}px` : null,
                bottom: box?.bottom !== undefined ? `${box.bottom}px` : null,
                minWidth: box ? `${box.minWidth}px` : null,
                maxHeight: box ? `${box.maxHeight}px` : null,
                visibility: box ? 'visible' : 'hidden'
              })}
            >
              ${this.options.map(
                (option, at) =>
                  html`<div
                    data-row=${at}
                    role="option"
                    aria-selected=${option.value === this.value ? 'true' : 'false'}
                    class=${`select-option${at === this.active ? ' active' : ''}${option.value === this.value ? ' picked' : ''}`}
                    @mouseenter=${() => (this.active = at)}
                    @click=${() => this.commit(option)}
                  >
                    ${option.icon ? html`<wt-icon name=${option.icon} size=${IconSize.Sm}></wt-icon>` : nothing}
                    <span class="select-option-label">${option.label}</span>
                    ${option.value === this.value ? html`<wt-icon name="check" size=${IconSize.Sm} class="select-tick"></wt-icon>` : nothing}
                  </div>`
              )}
            </div>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-select': WtSelect
  }
}
