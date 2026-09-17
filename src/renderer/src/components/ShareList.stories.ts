import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { classColor } from '../enums/classToken'
import { GOLD, ROSTER } from '../stories/fixtures'
import './ClassMedallion'
import './ui/Button'
import './ui/Panel'
import './ShareList'
import './ShareRow'

const meta: Meta = {
  title: 'Shared/ShareList'
}

export default meta

/** The breakdown of the gold: each part with its share as a bar and a figure, and its amount. */
export const Shares: StoryObj = {
  render: () =>
    html`<div style="max-width: 420px">
      <wt-panel icon="vault" heading="Aufteilung" class="gold-panel">
        <wt-share-list>
          <wt-share-row value=${GOLD.characters} total=${GOLD.total}>Charaktere</wt-share-row>
          <wt-share-row value=${GOLD.warband} total=${GOLD.total}>Kriegsmeute</wt-share-row>
        </wt-share-list>
      </wt-panel>
    </div>`
}

/**
 * By character: the medallion, the name as the way to the page, the share.
 * A character off the roster is dimmed and says so after its name.
 */
export const ByCharacter: StoryObj = {
  render: () =>
    html`<div style="max-width: 480px">
      <wt-panel icon="users" heading="Nach Charakter" class="gold-panel">
        <wt-share-list>
          ${[...ROSTER]
            .sort((a, b) => (b.money ?? 0) - (a.money ?? 0))
            .map(
              (character, index) =>
                html`<wt-share-row value=${character.money ?? 0} total=${GOLD.characters} ?off=${index === 2}>
                  <wt-class-medallion .character=${character} size="22"></wt-class-medallion>
                  <wt-button
                    class="char-open"
                    label=${character.name}
                    style=${styleMap({ color: classColor(character.classToken) ?? '' })}
                    data-tip="Charakterseite öffnen"
                  ></wt-button>
                  ${index === 2 ? html`<span class="faint tiny">nicht im Roster</span>` : nothing}
                </wt-share-row>`
            )}
        </wt-share-list>
      </wt-panel>
    </div>`
}
