import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { TableKind } from '../../enums/tableKind'
import { ControlSize } from '../../enums/controlSize'
import { Severity } from '../../enums/severity'
import './Button'
import './Card'
import './Table'
import './Format'
import './Row'
import './Cell'

const meta: Meta = {
  title: 'UI/Table',
  component: 'wt-table'
}

export default meta

/** The settings' list: a few rows, a remove button at the end of each. */
export const Plain: StoryObj = {
  render: () =>
    html`<wt-card class="panel" style="max-width: 560px">
      <wt-table .columns=${[{ label: 'Quest' }, { label: 'ID', className: 'col-id' }, { label: '', className: 'row-action' }]}>
        ${[
          ['Midnight: Delves', 93909],
          ['Midnight: Dungeons', 93911],
          ['Midnight: Raid', 93912]
        ].map(
          ([label, id]) =>
            html`<wt-row>
              <wt-cell>${label}</wt-cell>
              <wt-cell class="num">${id}</wt-cell>
              <wt-cell class="row-action"
                ><wt-button icon="trash" ghost size=${ControlSize.Sm} tone=${Severity.Danger} icon-only data-tip="Entfernen"></wt-button
              ></wt-cell>
            </wt-row>`
        )}
      </wt-table>
    </wt-card>`
}

/** Without a head: the goals. */
export const PlainNoHead: StoryObj = {
  render: () =>
    html`<wt-card class="panel" style="max-width: 560px">
      <wt-table>
        <wt-row>
          <wt-cell>Vault-Fächer</wt-cell>
          <wt-cell class="num">Ziel: 6</wt-cell>
          <wt-cell class="row-action"
            ><wt-button icon="trash" ghost size=${ControlSize.Sm} tone=${Severity.Danger} icon-only></wt-button
          ></wt-cell>
        </wt-row>
        <wt-row>
          <wt-cell>M+ Runs</wt-cell>
          <wt-cell class="num">Ziel: 4</wt-cell>
          <wt-cell class="row-action"
            ><wt-button icon="trash" ghost size=${ControlSize.Sm} tone=${Severity.Danger} icon-only></wt-button
          ></wt-cell>
        </wt-row>
      </wt-table>
    </wt-card>`
}

/** The character page's table, in its scroll box; a dash for a figure that is not there. */
export const Detail: StoryObj = {
  render: () =>
    html`<wt-card class="panel dash-panel" style="max-width: 560px">
      <wt-table
        kind=${TableKind.Detail}
        .columns=${[{ label: 'Dungeon' }, { label: 'Stufe', num: true }, { label: 'Ergebnis' }, { label: 'Punkte', num: true }]}
      >
        <wt-row>
          <wt-cell>Ara-Kara, City of Echoes</wt-cell>
          <wt-cell class="num">+13</wt-cell>
          <wt-cell class="ok-text">in der Zeit</wt-cell>
          <wt-cell class="num">318</wt-cell>
        </wt-row>
        <wt-row class="detail-weakest">
          <wt-cell>Cinderbrew Meadery</wt-cell>
          <wt-cell class="num">+12</wt-cell>
          <wt-cell class="warn-text">über der Zeit</wt-cell>
          <wt-cell class="num">282</wt-cell>
        </wt-row>
        <wt-row>
          <wt-cell>The Rookery</wt-cell>
          <wt-cell class="num"><wt-format class="faint"></wt-format></wt-cell>
          <wt-cell><wt-format class="faint"></wt-format></wt-cell>
          <wt-cell class="num"><wt-format class="faint"></wt-format></wt-cell>
        </wt-row>
      </wt-table>
    </wt-card>`
}
