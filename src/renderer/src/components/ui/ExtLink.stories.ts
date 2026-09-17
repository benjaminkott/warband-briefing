import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import { BrandId } from '../../enums/brandId'
import { brandColor } from '../BrandMark'
import './ExtLink'
import './Checkbox'
import '../BrandMark'
import './CheckGrid'

interface Args {
  href: string
  site: string
  label: string
  mark: boolean
}

const meta: Meta<Args> = {
  title: 'UI/ExtLink',
  component: 'wt-ext-link',
  args: { href: 'https://www.wowhead.com/currency=3008', site: 'Wowhead', label: '3008', mark: true },
  render: (args) => html`<wt-ext-link href=${args.href} site=${args.site} label=${args.label} ?mark=${args.mark}></wt-ext-link>`
}

export default meta

/** The plain link: the words, the mark that says it leaves the app, the site and the address in the tooltip. */
export const Plain: StoryObj<Args> = {}

/** The tile of a character's sites (`brand-link`): the site's own mark, and its colour - `--brand` on the host - on the edge when the pointer is on it. */
export const Brand: StoryObj<Args> = {
  render: () =>
    html`<div class="char-links">
      ${[
        { id: BrandId.RaiderIo, label: 'Raider.IO', url: 'https://raider.io/characters/eu/blackrock/sarah' },
        { id: BrandId.Armory, label: 'Armory', url: 'https://worldofwarcraft.blizzard.com/en-gb/character/eu/blackrock/sarah' }
      ].map(
        (link) =>
          html`<wt-ext-link
            class="brand-link"
            href=${link.url}
            site=${link.label}
            .label=${html`<wt-brand-mark brand=${link.id} size="20"></wt-brand-mark>`}
            style=${styleMap({ '--brand': brandColor(link.id) })}
          ></wt-ext-link>`
      )}
    </div>`
}

interface WowheadArgs {
  kind: WowheadKind
  entryId: number
}

/** The id beside a name in the settings (`ext-link`, quiet and small), as the way to look the entry up on Wowhead. */
export const Wowhead: StoryObj<WowheadArgs> = {
  args: { kind: WowheadKind.Faction, entryId: 2590 },
  argTypes: { kind: { control: 'radio', options: Object.values(WowheadKind) } },
  render: (args) =>
    html`<wt-check-grid style="max-width: 320px">
      <wt-checkbox
        checked
        .label=${html`<span class="input-grow">Rat von Dornogal</span>
          <wt-ext-link
            class="faint tiny ext-link"
            href=${wowheadUrl(args.kind, args.entryId)}
            site="Wowhead"
            label=${String(args.entryId)}
            mark
          ></wt-ext-link>`}
      ></wt-checkbox>
    </wt-check-grid>`
}
