import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ICON_NAMES, type IconName } from './Icon'
import { CONFIG } from '../stories/fixtures'
import { ButtonRole } from '../enums/buttonRole'
import './EmptyState'
import './ui/Button'
import './Icon'
import { IconSize } from '../enums/iconSize'

interface Args {
  icon: IconName
  heading: string
  body: string
}

const meta: Meta<Args> = {
  title: 'Shared/EmptyState',
  component: 'wt-empty-state',
  args: { icon: 'search', heading: 'Nichts gefunden', body: 'Kein Charakter passt zu Suche und Filter.' },
  argTypes: { icon: { control: 'select', options: ICON_NAMES } },
  render: (args) => html`<wt-empty-state icon=${args.icon} heading=${args.heading}><p>${args.body}</p></wt-empty-state>`
}

export default meta

/** A view with nothing to show says so in the middle of the page. */
export const Sentence: StoryObj<Args> = {}

/** With the button that gets the reader out of it. */
export const WithAction: StoryObj<Args> = {
  render: (args) =>
    html`<wt-empty-state icon=${args.icon} heading=${args.heading}>
      <p>${args.body}</p>
      <div class="row"><wt-button icon="close" label="Filter zurücksetzen"></wt-button></div>
    </wt-empty-state>`
}

/**
 * What a fresh install sees instead of a roster, as the shell draws it: the
 * three steps to the first read, each ticked as far as it is done, and the
 * way to the settings. Here the folder is set and an addon was found.
 */
export const Setup: StoryObj<Args> = {
  render: () => {
    return html`<wt-empty-state icon="folder" heading="Erst einrichten">
      <p class="setup-intro">
        Nach dem ersten Login steht hier die Liste der Woche – die Schatzkammer, die Wochenquests, was sich heute Abend lohnt – für jeden
        Charakter, den WoW gesehen hat.
      </p>
      <ol class="steps">
        <li>
          WoW-Ordner prüfen <span class="ok-text"><wt-icon name="check" size=${IconSize.Sm}></wt-icon> ${CONFIG.wowPath}</span>
        </li>
        <li>
          Ein unterstütztes Addon installiert haben (siehe Datenquellen)
          <span class="ok-text"><wt-icon name="check" size=${IconSize.Sm}></wt-icon></span>
        </li>
        <li>Einmal in WoW einloggen und ausloggen — danach steht der Charakter hier.</li>
      </ol>
      <div class="row"><wt-button icon="settings" tone=${ButtonRole.Primary} label="Zu den Einstellungen"></wt-button></div>
    </wt-empty-state>`
  }
}
