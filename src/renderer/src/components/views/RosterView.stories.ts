import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { goldMonth } from '../../model/gold'
import { html } from 'lit'
import { Region } from '../../../../shared/enums/region'
import { displayFlags } from '../../../../shared/display'
import { rosterMaxLevel, sortCharacters } from '../../model/overview'
import { isPlayed } from '../../model/dashboard'
import { DEFAULT_PREFS, type ViewPrefs } from '../../prefs'
import { CHAR_HISTORY, CONFIG, GOLD, GOLD_HISTORY, NEXT_RESET_AT, RESET_AT, ROSTER, translatorFor } from '../../stories/fixtures'
import { ViewMode } from '../../enums/viewMode'
import './RosterView'

interface Args {
  view: ViewPrefs['view']
  /** Whether the characters not played this week or last are in. */
  showQuiet: boolean
  query: string
  /** How many of the roster the board gets; one is the player with one character. */
  roster: number
}

const meta: Meta<Args> = {
  title: 'Views/RosterView',
  component: 'wt-roster-view',
  args: { view: ViewMode.Tiles, showQuiet: false, query: '', roster: 99 },
  argTypes: {
    view: { control: 'radio', options: Object.values(ViewMode) },
    roster: { control: { type: 'number', min: 1 } }
  },
  parameters: { layout: 'fullscreen' },
  render: (args, context) => {
    const tr = translatorFor(context)
    const flags = displayFlags(CONFIG)
    const maxLevel = rosterMaxLevel(ROSTER)
    const prefs: ViewPrefs = { ...DEFAULT_PREFS, view: args.view }
    const characters = ROSTER.slice(0, args.roster)
    // The shell's own filtering, repeated here so the story stands on its own.
    const query = args.query.trim().toLowerCase()
    const visible = sortCharacters(
      characters.filter((c) => {
        if (query && !c.name.toLowerCase().includes(query)) return false
        return args.showQuiet || isPlayed(c, RESET_AT)
      }),
      prefs.sort,
      prefs.direction,
      tr,
      maxLevel,
      CONFIG.goals,
      flags
    )
    return html`<div class="content" style="height: 100vh">
      <wt-roster-view
        .characters=${characters}
        .visible=${visible}
        quiet-count=${characters.filter((c) => !isPlayed(c, RESET_AT)).length}
        ?show-quiet=${args.showQuiet}
        .prefs=${prefs}
        .query=${args.query}
        .gold=${GOLD}
        .goldMonth=${goldMonth(GOLD_HISTORY, GOLD)}
        .history=${CHAR_HISTORY}
        .goals=${CONFIG.goals}
        .flags=${flags}
        .maxLevel=${maxLevel}
        .resetAt=${RESET_AT}
        .nextResetAt=${NEXT_RESET_AT}
        region=${Region.Eu}
        show-account
      ></wt-roster-view>
    </div>`
  }
}

export default meta

/** The roster tab: the figures, the toolbar, the roster as tiles, the renown, the season's bests. */
export const Tiles: StoryObj<Args> = {}

/** The roster as rows: who, the four figures, the step. */
export const Rows: StoryObj<Args> = { args: { view: ViewMode.Rows } }

export const Table: StoryObj<Args> = { args: { view: ViewMode.Table } }

/** One character: no toolbar, no roster - the character large, its vault and its list side by side. */
export const OneCharacter: StoryObj<Args> = { args: { roster: 1 } }

/** Nothing matches the search: the empty state with the reset button. */
export const NoMatch: StoryObj<Args> = { args: { query: 'zzz' } }

/** Nobody to show. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-roster-view
        .characters=${[]}
        .visible=${[]}
        .flags=${displayFlags(CONFIG)}
        .maxLevel=${rosterMaxLevel(ROSTER)}
        .resetAt=${RESET_AT}
        .nextResetAt=${NEXT_RESET_AT}
      ></wt-roster-view>
    </div>`
}
