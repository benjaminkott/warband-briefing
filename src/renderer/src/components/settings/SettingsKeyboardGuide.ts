import { html, nothing } from 'lit'
import { customElement } from 'lit/decorators.js'
import type { TranslationKey } from '../../../../shared/i18n'
import { WtPanel } from '../ui/Panel'
import { Command } from '../../enums/command'
import { Tab } from '../../enums/tab'
import { strokesOf } from '../../model/shortcuts'
import '../ui/FieldGroup'
import '../ui/Keys'
import '../ui/Hint'

/** One step of a way: what the player does, and the key that does it - or none for a click. */
interface GuideStep {
  text: TranslationKey
  command?: Command
  tab?: Tab
}

interface GuideWay {
  title: TranslationKey
  steps: GuideStep[]
}

/**
 * The ways the guide walks, each a few steps. The keys come from the table
 * in shortcuts.ts, so a rebound key changes the guide with it.
 */
const WAYS: GuideWay[] = [
  {
    title: 'settings.guide.flip.title',
    steps: [
      { text: 'settings.guide.flip.open', command: Command.OpenTab, tab: Tab.Tasks },
      { text: 'settings.guide.flip.back', command: Command.LastTab },
      { text: 'settings.guide.flip.again', command: Command.LastTab }
    ]
  },
  {
    title: 'settings.guide.character.title',
    steps: [
      { text: 'settings.guide.character.overview', command: Command.OpenTab, tab: Tab.Roster },
      { text: 'settings.guide.character.search', command: Command.Search },
      { text: 'settings.guide.character.open' },
      { text: 'settings.guide.character.next', command: Command.NextCharacter },
      { text: 'settings.guide.character.close', command: Command.ClosePage }
    ]
  },
  {
    title: 'settings.guide.trail.title',
    steps: [
      { text: 'settings.guide.trail.back', command: Command.Back },
      { text: 'settings.guide.trail.forward', command: Command.Forward }
    ]
  },
  {
    title: 'settings.guide.reread.title',
    steps: [{ text: 'settings.guide.reread.key', command: Command.Reread }]
  }
]

/**
 * The guide to the keyboard: a few ways through the app, step by step,
 * each step with the key that takes it. The table of every key follows in
 * the panel below; this one says what to do with them.
 */
@customElement('wt-settings-keyboard-guide')
export class WtSettingsKeyboardGuide extends WtPanel {
  protected override willUpdate(): void {
    const tr = this.tr
    this.icon = 'keyboard'
    this.heading = tr.t('settings.guide.title')
    this.description = tr.t('settings.guide.body')
    this.content = html`
      ${WAYS.map(
        (way) =>
          html`<section class="guide-way">
            <h3>${tr.t(way.title)}</h3>
            <ol class="guide-steps">
              ${way.steps.map((step) => {
                const stroke = step.command ? strokesOf(step.command, step.tab)[0] : undefined
                return html`<li>
                  <span class="guide-keys">${stroke ? html`<wt-keys .stroke=${stroke}></wt-keys>` : nothing}</span>
                  <span>${tr.t(step.text)}</span>
                </li>`
              })}
            </ol>
          </section>`
      )}
      <wt-hint icon="info" text=${tr.t('settings.guide.typing')}></wt-hint>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-keyboard-guide': WtSettingsKeyboardGuide
  }
}
