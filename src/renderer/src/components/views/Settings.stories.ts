import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import type { UpdateState } from '../../../../shared/types'
import { SETTINGS_SECTIONS } from '../settings/model'
import { ACCOUNTS, CONFIG, DATA_BUNDLE, ROSTER, SOURCES, UPDATE_AVAILABLE, UPDATE_READY, UPDATE_STATE } from '../../stories/fixtures'
import { SettingsSection } from '../../enums/settingsSection'
import './Settings'

interface Args {
  section: SettingsSection
  busy: boolean
  update: 'idle' | 'available' | 'ready' | 'error'
}

const UPDATES: Record<Args['update'], UpdateState> = {
  idle: UPDATE_STATE,
  available: UPDATE_AVAILABLE,
  ready: UPDATE_READY,
  error: { ...UPDATE_STATE, error: 'ENOTFOUND api.github.com' }
}

const meta: Meta<Args> = {
  title: 'Views/Settings',
  component: 'wt-settings',
  args: { section: SettingsSection.Setup, busy: false, update: 'idle' },
  argTypes: {
    section: { control: 'radio', options: SETTINGS_SECTIONS.map((entry) => entry.id) },
    update: { control: 'radio', options: ['idle', 'available', 'ready', 'error'] }
  },
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    html`<div class="content" style="height: 100vh">
      <wt-settings
        .config=${CONFIG}
        section=${args.section}
        resolved-locale=${CONFIG.resolvedLocale}
        .sources=${SOURCES}
        .updateState=${UPDATES[args.update]}
        ?busy=${args.busy}
        .characters=${ROSTER}
        .detectedQuests=${DATA_BUNDLE.detectedQuests}
        .learnedQuests=${DATA_BUNDLE.learnedQuests}
        .hiddenKeys=${new Set<string>()}
        .accounts=${ACCOUNTS}
        .hiddenAccounts=${new Set<string>()}
      ></wt-settings>
    </div>`
}

export default meta

/**
 * The sub-navigation and the open section's panels; each change is one
 * `wt-config` event with the patch. The pick is `wt-section` - the shell
 * keeps it, so the story only follows its own control.
 */
export const Page: StoryObj<Args> = {}

export const Roster: StoryObj<Args> = { args: { section: SettingsSection.Roster } }

export const Tasks: StoryObj<Args> = { args: { section: SettingsSection.Tasks } }

export const Appearance: StoryObj<Args> = { args: { section: SettingsSection.Appearance } }

/** The guide to the keys, and the table of all of them. */
export const Keyboard: StoryObj<Args> = { args: { section: SettingsSection.Keyboard } }

export const UpdateReady: StoryObj<Args> = { args: { section: SettingsSection.App, update: 'ready' } }
