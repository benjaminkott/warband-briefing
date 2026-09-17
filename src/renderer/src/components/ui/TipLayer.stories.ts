import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ControlSize } from '../../enums/controlSize'
import './TipLayer'
import './Button'
import './Chip'

const meta: Meta = {
  title: 'UI/TipLayer',
  component: 'wt-tip-layer',
  parameters: {
    docs: {
      description: {
        component:
          'The preview already carries one layer, so the stories only show what a `data-tip` does: rest the pointer on a thing, or tab to it.'
      }
    }
  }
}

export default meta

/** Anything with a `data-tip` says it on hover; a mark alone is named by it for the screen reader too. */
export const OnHover: StoryObj = {
  render: () =>
    html`<div style="display: flex; gap: var(--s2); align-items: center">
      <wt-button icon="check" icon-only size=${ControlSize.Sm} data-tip="Erledigt"></wt-button>
      <wt-button label="Neu lesen" icon="refresh" data-tip="Die SavedVariables jetzt neu einlesen"></wt-button>
      <wt-chip label="Ara-Kara" note="+12" data-tip="Ara-Kara, Stadt der Echos · +12 · in der Zeit"></wt-chip>
      <wt-chip label="WOW1" data-tip="WTF-Account"></wt-chip>
    </div>`
}

/** A tip breaks its lines where the text does, and wraps a long one. */
export const MultiLine: StoryObj = {
  render: () =>
    html`<div style="display: flex; gap: var(--s2); align-items: center">
      <wt-chip
        label="Nerub-ar Palace HC"
        note="6/8"
        data-tip=${"Ulgrax der Verschlinger, Der blutgebundene Schrecken, Sikran, Rasha'nan, Bruthüterin Ovi'nax, Nexusprinzessin Ky'veza\nSetzt zurück in 3 Tagen"}
      ></wt-chip>
      <wt-chip
        label="Ausrüstung"
        data-tip="Ein sehr langer Hinweis, der über die Breite eines Tooltips hinausgeht und daher an der Wortgrenze umbrochen wird, statt bis an den Rand des Fensters zu laufen."
      ></wt-chip>
    </div>`
}

/** At the window's edges the tip moves back into view sideways and flips over its target at the bottom. */
export const AtTheEdges: StoryObj = {
  render: () =>
    html`<div style="height: calc(100vh - 4rem); display: flex; flex-direction: column; justify-content: space-between">
      <div style="display: flex; justify-content: space-between">
        <wt-button icon="chevronLeft" icon-only size=${ControlSize.Sm} data-tip="Ganz links oben: der Tipp rückt nach rechts"></wt-button>
        <wt-button icon="chevronRight" icon-only size=${ControlSize.Sm} data-tip="Ganz rechts oben: der Tipp rückt nach links"></wt-button>
      </div>
      <div style="display: flex; justify-content: center">
        <wt-button label="Unten" data-tip="Kein Platz darunter: der Tipp steht über dem Knopf"></wt-button>
      </div>
    </div>`,
  // The tip of the right button is sized by its text, not by the room to
  // the right of its anchor: it stays one line and moves left into view.
  play: async ({ canvasElement }) => {
    const [, right] = within(canvasElement).getAllByRole('button')
    await userEvent.hover(right)
    const tip = await waitFor(() => {
      const found = document.querySelector('wt-tip')
      expect(found).not.toBeNull()
      return found as HTMLElement
    })
    await waitFor(() => expect(tip.getBoundingClientRect().right).toBeLessThanOrEqual(document.documentElement.clientWidth))
    // One rect of the text is one line box.
    const text = document.createRange()
    text.selectNodeContents(tip)
    expect(text.getClientRects().length).toBe(1)
  }
}
