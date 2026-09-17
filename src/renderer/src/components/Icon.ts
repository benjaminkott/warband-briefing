/**
 * The icon set: Material Symbols Outlined, weight 400.
 *
 * The app reads local files and talks to nobody, so the glyphs cannot come
 * from a CDN or a web font. Each one is imported from the npm package as a
 * string, so only the icons named below end up in the bundle - no font file,
 * no 7000-glyph sheet. They are filled shapes on a 960-grid and sized by the
 * surrounding font size, so every icon sits on the same optical baseline.
 */

import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { IconSize } from '../enums/iconSize'
import search from '@material-symbols/svg-400/outlined/search.svg?raw'
import close from '@material-symbols/svg-400/outlined/close.svg?raw'
import viewAgenda from '@material-symbols/svg-400/outlined/view_agenda.svg?raw'
import viewList from '@material-symbols/svg-400/outlined/view_list.svg?raw'
import inventory2 from '@material-symbols/svg-400/outlined/inventory_2.svg?raw'
import key from '@material-symbols/svg-400/outlined/key.svg?raw'
import swords from '@material-symbols/svg-400/outlined/swords.svg?raw'
import castle from '@material-symbols/svg-400/outlined/castle.svg?raw'
import schedule from '@material-symbols/svg-400/outlined/schedule.svg?raw'
import calendarMonth from '@material-symbols/svg-400/outlined/calendar_month.svg?raw'
import toll from '@material-symbols/svg-400/outlined/toll.svg?raw'
import target from '@material-symbols/svg-400/outlined/target.svg?raw'
import group from '@material-symbols/svg-400/outlined/group.svg?raw'
import openInNew from '@material-symbols/svg-400/outlined/open_in_new.svg?raw'
import check from '@material-symbols/svg-400/outlined/check.svg?raw'
import lock from '@material-symbols/svg-400/outlined/lock.svg?raw'
import circle from '@material-symbols/svg-400/outlined/circle.svg?raw'
import refresh from '@material-symbols/svg-400/outlined/refresh.svg?raw'
import tune from '@material-symbols/svg-400/outlined/tune.svg?raw'
import folder from '@material-symbols/svg-400/outlined/folder.svg?raw'
import language from '@material-symbols/svg-400/outlined/language.svg?raw'
import desktopWindows from '@material-symbols/svg-400/outlined/desktop_windows.svg?raw'
import download from '@material-symbols/svg-400/outlined/download.svg?raw'
import add from '@material-symbols/svg-400/outlined/add.svg?raw'
import del from '@material-symbols/svg-400/outlined/delete.svg?raw'
import warning from '@material-symbols/svg-400/outlined/warning.svg?raw'
import info from '@material-symbols/svg-400/outlined/info.svg?raw'
import keyboardArrowUp from '@material-symbols/svg-400/outlined/keyboard_arrow_up.svg?raw'
import keyboardArrowDown from '@material-symbols/svg-400/outlined/keyboard_arrow_down.svg?raw'
import chevronLeft from '@material-symbols/svg-400/outlined/chevron_left.svg?raw'
import chevronRight from '@material-symbols/svg-400/outlined/chevron_right.svg?raw'
import arrowBack from '@material-symbols/svg-400/outlined/arrow_back.svg?raw'
import arrowForward from '@material-symbols/svg-400/outlined/arrow_forward.svg?raw'
import power from '@material-symbols/svg-400/outlined/power.svg?raw'
import receiptLong from '@material-symbols/svg-400/outlined/receipt_long.svg?raw'
import flag from '@material-symbols/svg-400/outlined/flag.svg?raw'
import speed from '@material-symbols/svg-400/outlined/speed.svg?raw'
import star from '@material-symbols/svg-400/outlined/star.svg?raw'
import swapVert from '@material-symbols/svg-400/outlined/swap_vert.svg?raw'
import filterAlt from '@material-symbols/svg-400/outlined/filter_alt.svg?raw'
import visibility from '@material-symbols/svg-400/outlined/visibility.svg?raw'
import link from '@material-symbols/svg-400/outlined/link.svg?raw'
import shield from '@material-symbols/svg-400/outlined/shield.svg?raw'
import wandStars from '@material-symbols/svg-400/outlined/wand_stars.svg?raw'
import diamond from '@material-symbols/svg-400/outlined/diamond.svg?raw'
import militaryTech from '@material-symbols/svg-400/outlined/military_tech.svg?raw'
import gavel from '@material-symbols/svg-400/outlined/gavel.svg?raw'
import mail from '@material-symbols/svg-400/outlined/mail.svg?raw'
import shoppingBag from '@material-symbols/svg-400/outlined/shopping_bag.svg?raw'
import accountBalance from '@material-symbols/svg-400/outlined/account_balance.svg?raw'
import trendingUp from '@material-symbols/svg-400/outlined/trending_up.svg?raw'
import checklist from '@material-symbols/svg-400/outlined/checklist.svg?raw'
import editNote from '@material-symbols/svg-400/outlined/edit_note.svg?raw'
import trendingDown from '@material-symbols/svg-400/outlined/trending_down.svg?raw'
import handyman from '@material-symbols/svg-400/outlined/handyman.svg?raw'
import keyboard from '@material-symbols/svg-400/outlined/keyboard.svg?raw'
import minimize from '@material-symbols/svg-400/outlined/minimize.svg?raw'
import checkBoxOutlineBlank from '@material-symbols/svg-400/outlined/check_box_outline_blank.svg?raw'
import filterNone from '@material-symbols/svg-400/outlined/filter_none.svg?raw'
import rule from '@material-symbols/svg-400/outlined/rule.svg?raw'

export type IconName =
  | 'search'
  | 'close'
  | 'cards'
  | 'table'
  | 'vault'
  | 'keystone'
  | 'raid'
  | 'dungeon'
  | 'clock'
  | 'calendar'
  | 'coins'
  | 'target'
  | 'users'
  | 'external'
  | 'check'
  | 'lock'
  | 'dot'
  | 'refresh'
  | 'settings'
  | 'folder'
  | 'globe'
  | 'monitor'
  | 'download'
  | 'plus'
  | 'trash'
  | 'alert'
  | 'info'
  | 'chevronUp'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'arrowLeft'
  | 'arrowRight'
  | 'plug'
  | 'scroll'
  | 'flag'
  | 'gauge'
  | 'tasks'
  | 'pin'
  | 'star'
  | 'sort'
  | 'filter'
  | 'eye'
  | 'link'
  | 'shield'
  | 'wand'
  | 'gem'
  | 'medal'
  | 'gavel'
  | 'mail'
  | 'bag'
  | 'bank'
  | 'trendUp'
  | 'trendDown'
  | 'anvil'
  | 'keyboard'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'pick'

// The names stay the app's own vocabulary ("vault", "keystone") rather than
// Material's, so a glyph can be swapped here without touching the views.
const SYMBOLS: Record<IconName, string> = {
  search,
  close,
  cards: viewAgenda,
  table: viewList,
  // A closed box: the Great Vault's reward, and the thing the week is about.
  vault: inventory2,
  keystone: key,
  raid: swords,
  dungeon: castle,
  clock: schedule,
  calendar: calendarMonth,
  coins: toll,
  target,
  users: group,
  external: openInNew,
  check,
  lock,
  // An empty ring next to "check": the entry is still open.
  dot: circle,
  refresh,
  // Sliders: settings the user actually turns, not a machine part.
  settings: tune,
  folder,
  globe: language,
  monitor: desktopWindows,
  download,
  plus: add,
  trash: del,
  alert: warning,
  info,
  chevronUp: keyboardArrowUp,
  chevronDown: keyboardArrowDown,
  chevronLeft,
  chevronRight,
  arrowLeft: arrowBack,
  arrowRight: arrowForward,
  // A plug: where the numbers come from.
  plug: power,
  scroll: receiptLong,
  flag,
  gauge: speed,
  tasks: checklist,
  pin: editNote,
  star,
  sort: swapVert,
  filter: filterAlt,
  eye: visibility,
  link,
  /* Gear: a shield, the one shape that reads as "equipment" at 11px. */
  shield,
  /* The two gear errands: a wand for an enchant, a gem for a socket. */
  wand: wandStars,
  gem: diamond,
  /* Renown: a medal. */
  medal: militaryTech,
  /* An auction hammer. */
  gavel,
  mail,
  bag: shoppingBag,
  bank: accountBalance,
  trendUp: trendingUp,
  trendDown: trendingDown,
  /* Professions: the tools. */
  anvil: handyman,
  keyboard,
  // Window controls: the three glyphs Windows itself draws, in the same weight
  // as the rest of the set so they read as part of the bar and not as chrome.
  minimize,
  maximize: checkBoxOutlineBlank,
  restore: filterNone,
  // A list with a tick and a cross: which lines are taken, which are not.
  pick: rule
}

/** Every name the set knows, for the story that shows the whole sheet. */
export const ICON_NAMES = Object.keys(SYMBOLS) as IconName[]

// Every Material Symbol is a single <path d="…"> on a "0 -960 960 960" box;
// only the path data is kept so the svg element stays ours (size, colour,
// accessibility) instead of whatever the file declares.
//
// The glyph itself lives on the 20dp "live area" inside that 24dp box. Most
// icons here are 10-13px tall, where those two padding units per side cost a
// sixth of the drawing and leave hairlines that blur. The view box is cropped
// to the live area (plus a sliver so rounded corners are not clipped), which
// makes the strokes render close to a whole pixel again.
const VIEW_BOX = '60 -900 840 840'
function pathData(svg: string): string {
  const match = / d="([^"]+)"/.exec(svg)
  if (!match) throw new Error('Material Symbol without path data')
  return match[1]
}

const PATHS: Record<IconName, string> = Object.fromEntries(Object.entries(SYMBOLS).map(([name, svg]) => [name, pathData(svg)])) as Record<
  IconName,
  string
>

/**
 * One glyph. The host is the `.icon` that a parent's rule addresses, an
 * inline-block the size of the svg inside it; the svg itself is
 * only the drawing. The drawing lives in a shadow root, so an icon looks
 * the same inside another element's shadow tree - a chip's - where
 * `styles.css` does not reach. The size is a step of the icon scale
 * (`IconSize`), reflected as an attribute so the step is a rule of the
 * element's own sheet; a place can still set `--icon-size` on the host,
 * and that wins. An icon is decorative unless it stands alone, in which
 * case `label` names it for the screen reader and as the tooltip.
 */
@customElement('wt-icon')
export class WtIcon extends WtElement {
  static override shadow = true
  /* The host sits in the line the way the drawing did; the drawing fills
     it, so the host is exactly the drawing's size and not a line box
     around it. The colour is the text's, so a parent tints the mark by
     colouring the host. */
  static override styles = css`
    :host {
      display: inline-block;
      flex: 0 0 auto;
      vertical-align: -0.14em;
    }

    :host([size='xs']) {
      --icon-size: var(--icon-xs);
    }

    :host([size='sm']) {
      --icon-size: var(--icon-sm);
    }

    :host([size='md']) {
      --icon-size: var(--icon-md);
    }

    :host([size='lg']) {
      --icon-size: var(--icon-lg);
    }

    :host([size='xl']) {
      --icon-size: var(--icon-xl);
    }

    svg {
      display: block;
      width: var(--icon-size);
      height: var(--icon-size);
    }
  `
  @property() accessor name!: IconName
  /** A step of the icon scale; the one of a line of body type by default. */
  @property({ reflect: true }) accessor size: IconSize = IconSize.Sm
  /** Only for icons that stand alone; a labelled icon stays decorative. */
  @property() accessor label: string | undefined = undefined

  protected override willUpdate(): void {
    this.hostClasses({ icon: true })
    this.hostTip(this.label)
    if (this.label) {
      this.setAttribute('role', 'img')
      this.setAttribute('aria-label', this.label)
      this.removeAttribute('aria-hidden')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('aria-label')
      this.setAttribute('aria-hidden', 'true')
    }
  }

  protected override render(): TemplateResult {
    return html`<svg viewBox=${VIEW_BOX} fill="currentColor" aria-hidden="true" focusable="false">
      <path d=${PATHS[this.name]} />
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-icon': WtIcon
  }
}
