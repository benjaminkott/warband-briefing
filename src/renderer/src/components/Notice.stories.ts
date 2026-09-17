import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Severity } from '../enums/severity'
import { ButtonRole } from '../enums/buttonRole'
import { UPDATE_DOWNLOADING, UPDATE_READY } from '../stories/fixtures'
import './Notice'
import './ui/Bar'
import './ui/Button'

interface Args {
  tone: Severity
  text: string
}

const meta: Meta<Args> = {
  title: 'Shared/Notice',
  component: 'wt-notice',
  args: { tone: Severity.Info, text: 'Die SavedVariables wurden vor 5 Minuten gelesen.' },
  argTypes: { tone: { control: 'radio', options: Object.values(Severity) } },
  render: (args) => html`<wt-notice tone=${args.tone}>${args.text}</wt-notice>`
}

export default meta

export const Info: StoryObj<Args> = {}
export const Ok: StoryObj<Args> = { args: { tone: Severity.Ok, text: 'Einstellungen gespeichert.' } }
export const Warn: StoryObj<Args> = { args: { tone: Severity.Warn, text: 'Kein WoW-Ordner eingestellt.' } }
export const Danger: StoryObj<Args> = { args: { tone: Severity.Danger, text: 'SavedInstances.lua: unexpected token at line 42' } }

/** The four severities side by side: one family of tokens each, the same mark on every box that carries the state. */
export const AllSeverities: StoryObj<Args> = {
  render: () => html`${Object.values(Severity).map((tone) => html`<wt-notice tone=${tone}>${tone}</wt-notice>`)}`
}

/**
 * The shell's message where a view shows it, with the button that takes the
 * reader on: the first character has arrived while the reader is in the
 * settings, and the way to the list is on the message.
 */
export const ShellMessage: StoryObj<Args> = {
  render: () =>
    html`<wt-notice banner tone=${Severity.Ok}>
      <span>Kaelthas ist da.</span><wt-button tone=${ButtonRole.Primary} label="Zur Liste"></wt-button>
    </wt-notice>`
}

/** The update banner above the overview: on its way with its progress, or downloaded with the one button that restarts into it. */
export const UpdateBanner: StoryObj<Args> = {
  render: () =>
    html`<wt-notice banner>
        <span>Lade Version ${UPDATE_DOWNLOADING.latestVersion} herunter… ${UPDATE_DOWNLOADING.percent}%</span>
        <wt-bar class="update-progress" percent=${UPDATE_DOWNLOADING.percent}></wt-bar>
      </wt-notice>
      <wt-notice banner tone=${Severity.Ok}>
        <span>Version ${UPDATE_READY.latestVersion} ist heruntergeladen und bereit.</span>
        <wt-button icon="download" tone=${ButtonRole.Primary} label="Neu starten & installieren"></wt-button>
      </wt-notice>`
}
