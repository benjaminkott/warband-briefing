import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { MAIN, ROSTER } from '../../stories/fixtures'
import { classColor } from '../../enums/classToken'
import { ICON_NAMES, type IconName } from '../Icon'
import type { ButtonTone } from './Button'
import { ButtonRole } from '../../enums/buttonRole'
import { ControlSize } from '../../enums/controlSize'
import { Severity } from '../../enums/severity'
import './Button'

interface Args {
  label: string
  icon?: IconName
  tone: ButtonTone
  size: ControlSize
  ghost: boolean
  iconOnly: boolean
  active: boolean
  disabled: boolean
  spinning: boolean
}

const TONES: ButtonTone[] = [ButtonRole.Default, ButtonRole.Primary, Severity.Danger]

const meta: Meta<Args> = {
  title: 'UI/Button',
  component: 'wt-button',
  args: {
    label: 'Neu einlesen',
    icon: 'refresh',
    tone: ButtonRole.Default,
    size: ControlSize.Md,
    ghost: false,
    iconOnly: false,
    active: false,
    disabled: false,
    spinning: false
  },
  argTypes: {
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
    tone: { control: 'radio', options: TONES },
    size: { control: 'radio', options: Object.values(ControlSize) }
  },
  render: (args) =>
    html`<wt-button
      label=${args.label}
      icon=${args.icon ?? nothing}
      tone=${args.tone}
      size=${args.size}
      ?ghost=${args.ghost}
      ?icon-only=${args.iconOnly}
      ?active=${args.active}
      ?disabled=${args.disabled}
      ?spinning=${args.spinning}
    ></wt-button>`
}

export default meta

export const Default: StoryObj<Args> = {}
export const Primary: StoryObj<Args> = { args: { tone: ButtonRole.Primary, icon: 'download', label: 'Update installieren' } }
export const Danger: StoryObj<Args> = { args: { tone: Severity.Danger, icon: 'trash', label: 'Charakter entfernen' } }
export const Ghost: StoryObj<Args> = { args: { ghost: true, size: ControlSize.Sm, icon: 'plus', label: 'Midnight: Prey' } }
export const GhostPrimary: StoryObj<Args> = {
  args: { ghost: true, size: ControlSize.Sm, tone: ButtonRole.Primary, icon: 'plus', label: 'Aufgabe anlegen' }
}
export const GhostDanger: StoryObj<Args> = {
  args: { ghost: true, size: ControlSize.Sm, tone: Severity.Danger, iconOnly: true, icon: 'trash', label: '' }
}
export const IconOnly: StoryObj<Args> = { args: { iconOnly: true, size: ControlSize.Sm, icon: 'chevronUp', label: '' } }
export const Busy: StoryObj<Args> = { args: { spinning: true, disabled: true, label: 'Wird eingelesen…' } }

/** Every tone, filled and ghost, in each state. */
export const Sheet: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3)">
      ${[false, true].map((ghost) =>
        TONES.map((tone) => {
          const label = ghost ? `ghost ${tone}` : tone
          return html`<div class="row">
            <wt-button tone=${tone} ?ghost=${ghost} icon="check" label=${label}></wt-button>
            <wt-button tone=${tone} ?ghost=${ghost} icon="check" label=${label} active></wt-button>
            <wt-button tone=${tone} ?ghost=${ghost} icon="check" label=${label} disabled></wt-button>
            <wt-button tone=${tone} ?ghost=${ghost} icon="check" icon-only data-tip=${label}></wt-button>
          </div>`
        })
      )}
    </div>`
}

/** The three sizes: the mark and the type follow the box. */
export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3)">
      ${Object.values(ControlSize).map(
        (size) =>
          html`<div class="row">
            <wt-button size=${size} icon="refresh" label=${size}></wt-button>
            <wt-button size=${size} tone=${ButtonRole.Primary} icon="download" label=${size}></wt-button>
            <wt-button size=${size} ghost icon="plus" label=${size}></wt-button>
            <wt-button size=${size} icon="close" icon-only data-tip=${size}></wt-button>
          </div>`
      )}
    </div>`
}

/**
 * A character's name as the way to the character's page: the `char-open`
 * class, the class colour on the host, `wt-open-character` on the click.
 * A button for the keyboard's sake, drawn as the name it replaces - in a
 * sentence, and in the types the places set on top (`card-name`,
 * `table-name`, `matrix-char`).
 */
export const CharacterName: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3); align-items: flex-start">
      <p style="margin: 0">
        Rewards waiting —
        ${ROSTER.map(
          (character, index) =>
            html`${index > 0 ? ', ' : ''}<wt-button
                class="char-open"
                label=${character.name}
                style=${styleMap({ color: classColor(character.classToken) ?? '' })}
                data-tip="Charakterseite öffnen"
              ></wt-button>`
        )}
      </p>
      ${['card-name', 'table-name', 'matrix-char'].map(
        (place) =>
          html`<wt-button
            class=${classMap({ 'char-open': true, [place]: true })}
            label=${MAIN.name}
            style=${styleMap({ color: classColor(MAIN.classToken) ?? '' })}
            data-tip="Charakterseite öffnen"
          ></wt-button>`
      )}
    </div>`
}
