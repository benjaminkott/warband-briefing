import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { GoldRange } from '../../enums/goldRange'
import { SettingsSection } from '../../enums/settingsSection'
import { TaskGrouping } from '../../enums/taskGrouping'
import { Tab } from '../../enums/tab'
import './Segmented'

interface Args {
  value: string
}

const meta: Meta<Args> = {
  title: 'UI/Segmented',
  component: 'wt-segmented',
  args: { value: GoldRange.Month },
  argTypes: { value: { control: 'radio', options: Object.values(GoldRange) } },
  render: (args) =>
    html`<wt-segmented
      .value=${args.value}
      .options=${[
        { value: GoldRange.Week, label: '7 Tage' },
        { value: GoldRange.Month, label: '30 Tage' },
        { value: GoldRange.Quarter, label: '90 Tage' },
        { value: GoldRange.All, label: 'Gesamt' }
      ]}
    ></wt-segmented>`
}

export default meta

/** The range strip of the gold view: text alone. */
export const Ranges: StoryObj<Args> = {}

/** The filters of the toolbar: a mark before every word, a tip on the first. */
export const WithIcons: StoryObj<Args> = {
  args: { value: TaskGrouping.Character },
  argTypes: { value: { control: 'radio', options: Object.values(TaskGrouping) } },
  render: (args) =>
    html`<wt-segmented
      .value=${args.value}
      .options=${[
        { value: TaskGrouping.Character, icon: 'users', label: 'Nach Charakter', tip: 'Jeder Charakter mit seiner Woche' },
        { value: TaskGrouping.Chore, icon: 'tasks', label: 'Nach Aufgabe' }
      ]}
    ></wt-segmented>`
}

/** The tabs of the top bar, which hide their words when the bar is narrow. */
export const Tabs: StoryObj<Args> = {
  args: { value: Tab.Roster },
  argTypes: { value: { control: 'radio', options: Object.values(Tab) } },
  render: (args) =>
    html`<div class="topbar" style="position: static">
      <wt-segmented
        class="tabs"
        .value=${args.value}
        .options=${[
          { value: Tab.Roster, icon: 'users', label: html`<span class="tab-label">Roster</span>` },
          { value: Tab.Gold, icon: 'coins', label: html`<span class="tab-label">Gold</span>` },
          { value: Tab.Bank, icon: 'bank', label: html`<span class="tab-label">Bank</span>` },
          { value: Tab.Settings, icon: 'settings', label: html`<span class="tab-label">Einstellungen</span>` }
        ]}
      ></wt-segmented>
    </div>`
}

/** The sections of the settings page: the same switches stood on end, a mark before every word. */
export const Vertical: StoryObj<Args> = {
  args: { value: SettingsSection.Tasks },
  argTypes: { value: { control: 'radio', options: Object.values(SettingsSection) } },
  render: (args) =>
    html`<div style="width: 200px">
      <wt-segmented
        vertical
        .value=${args.value}
        .options=${[
          { value: SettingsSection.Setup, icon: 'plug', label: 'Einrichtung' },
          { value: SettingsSection.Roster, icon: 'users', label: 'Roster' },
          { value: SettingsSection.Tasks, icon: 'tasks', label: 'Aufgaben' },
          { value: SettingsSection.Appearance, icon: 'eye', label: 'Darstellung' },
          { value: SettingsSection.App, icon: 'download', label: 'Anwendung' }
        ]}
      ></wt-segmented>
    </div>`
}
