import { css, html, nothing, svg, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { WtElement } from '../../element'
import './Tip'

/** One arc of the ring: the filled part in percent, and the text of its tip. */
export interface RingGroup {
  percent: number
  label?: string
  /**
   * The fill of this one arc, as the app passes a heat colour: the three
   * numbers of an `hsl()`, for example `142 70% 62%`. Without it the arc
   * takes the ring's own colour, so a ring whose groups are not telling
   * two things apart stays one colour.
   */
  color?: string
}

/** A point on a circle. 0 degrees is at the top. */
function polar(centre: number, radius: number, degrees: number): [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180
  return [centre + radius * Math.cos(radians), centre + radius * Math.sin(radians)]
}

/**
 * A whole circle, as degrees. Not 360: a path whose ends meet exactly draws
 * nothing, and two round caps that butt against each other leave a hairline
 * where they meet. A hair under a full turn makes the caps overlap, and the
 * ring closes.
 */
const WHOLE = 359.9

/** The arc from `from` to `to`, as an SVG path for a stroke. */
function arc(centre: number, radius: number, from: number, to: number): string {
  const [x1, y1] = polar(centre, radius, from)
  const [x2, y2] = polar(centre, radius, to)
  const large = to - from > 180 ? 1 : 0
  return `M${x1} ${y1}A${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
}

/**
 * The gap between two groups, in stroke widths, not in degrees. A small ring
 * then keeps the proportions of a large ring. The value is the same for every
 * ring, so all rings look the same.
 */
const GAP = 1.5

/**
 * The gap between the groups and the outer ring, across the ring rather than
 * along it, in stroke widths.
 *
 * Smaller than the gap between two groups: arcs side by side have to be told
 * apart, two rings one inside the other are told apart by being rings. One
 * stroke is also what the groups then leave the content in the middle at the
 * sizes the board draws, so the drawing reads on one rhythm from the rim to
 * the middle.
 */
const RING_GAP = 1

/**
 * A ring of groups around a content in the middle.
 *
 * Each group is one arc. All arcs have the same length. Each arc is filled to
 * the percent of its group, for example the three rows of the vault. The
 * shape shows the state before the reader reads a figure, and it shows which
 * group is empty. A single progress arc cannot show that. One group alone is
 * a closed progress ring. The fill animates when the ring appears and when a
 * percent changes. When the pointer is on an arc, a tip above the ring shows
 * its label. The content in the middle is the ring's children. The host has
 * the size of the drawing. With `disc`, the ring is drawn on a dark plate
 * with a rim, as the game shows a faction. A `badge` is a figure at the
 * bottom of the ring. The drawing, the plate and the badge are the ring's
 * own stylesheet. The colour comes from `--ring-color`,
 * `--ring-color-bright`, and `--ring-glow` on the host or on a parent. The
 * default is the accent.
 *
 * With `outer`, one more arc runs around all of them: a single fill of one
 * percent, with the groups moved inward to make room. The groups say where
 * the work stands, the outer ring says how far that is towards the line the
 * reader works to.
 *
 * It is drawn to be read second: a shade lighter than the groups, one flat
 * quiet colour, no gradient and no glow. A board of a dozen of them must
 * still be the characters, not a wall of rings. The one moment it speaks up
 * is the line crossed - then it closes, takes the `ok` green every finished
 * thing in the app wears, and glows.
 */
@customElement('wt-ring')
export class WtRing extends WtElement {
  static override shadow = true

  static override styles = css`
    /* The figure lives inside the ring, so a tile is one object the eye
       lands on rather than a number with a decoration beside it. The colour
       of the ring is \`--ring-color\` with \`--ring-color-bright\` and
       \`--ring-glow\`, set by a parent or on the host. The defaults are the
       accent and sit at each use as fallback: a value here would hide what
       a parent sets. */
    :host {
      position: relative;
      display: block;
      flex: 0 0 auto;
      width: var(--ring-size);
      height: var(--ring-size);
      /* The plate is behind the drawing, but not behind the surface under the ring. */
      isolation: isolate;
    }

    /* The plate: a dark disc under the ring. It is darker towards the rim,
       so the arcs look set into it. A hairline rim is outside the arcs, and
       a drop shadow lifts the plate off the surface. */
    :host([disc])::before {
      content: '';
      position: absolute;
      z-index: -1;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 40%, var(--bg-raised), var(--bg-sunken) 72%, var(--bg) 100%);
      box-shadow:
        inset 0 0 0 1px var(--border-strong),
        inset 0 0 0 2px var(--bg),
        0 2px 8px rgba(0, 0, 0, 0.45);
    }

    /* The badge is on the rim at the bottom, in the colour of the ring. It
       scales with the ring, with a floor for the small rings of the rows. */
    .badge {
      position: absolute;
      left: 50%;
      bottom: calc(-1 * var(--s1));
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: max(20px, calc(var(--ring-size) * 0.25));
      height: max(var(--s5), calc(var(--ring-size) * 0.25));
      padding: 0 var(--s2);
      border-radius: var(--radius-pill);
      background: var(--bg-sunken);
      border: 1px solid var(--border-strong);
      box-shadow: var(--shadow);
      font-size: max(var(--fs-micro), calc(var(--ring-size) * 0.16));
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: var(--lh-none);
      color: var(--ring-color-bright, var(--accent-bright));
      pointer-events: none;
    }

    svg {
      display: block;
      /* The hovered arc steps outward past the drawing's edge. */
      overflow: visible;
    }

    .body {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--s0);
      pointer-events: none;
    }

    /* One arc for each group, for example the raid, dungeon, and world rows
       of the vault: a track with the fill on it to the progress of the group.
       The arcs take no pointer events. The pointer is on the wide invisible
       circle under them, and the element finds the group from the angle. */
    .arc {
      fill: none;
      stroke: var(--border-strong);
      stroke-linecap: round;
      pointer-events: none;
      transition: stroke 0.12s;
    }

    /* On the plate, the track is a groove in the plate, not a line on it. */
    :host([disc]) .arc {
      stroke: var(--bg);
    }

    /* The fill is a dash with the length of the share. The element sets the
       offset inline over a path length of 100, so a change slides instead of
       jumps. The colour is a gradient along the arc, as the fill of the bar
       runs from accent to bright: a group that is further has a brighter
       tip. A full arc ends in the bright accent and glows a little. So the
       reader can tell "done" from "almost" in the colour of the vault, and
       the ring does not need a green that no other element uses. */
    .arc.on {
      stroke-dasharray: 100 100;
      transition:
        stroke-dashoffset 0.7s cubic-bezier(0.2, 0.7, 0.2, 1),
        filter 0.2s;
    }

    .stop-from {
      stop-color: var(--ring-color, var(--accent));
    }

    .stop-to {
      stop-color: var(--ring-color-bright, var(--accent-bright));
    }

    .arc.on.full {
      filter: drop-shadow(0 0 3px var(--ring-glow, var(--accent-line)));
    }

    /* The outer ring: one flat colour held back, so it frames the groups
       instead of competing with them. No gradient - a closed ring has
       nowhere to run one to - and no glow until it is closed. */
    .arc.on.outer {
      stroke: var(--ring-color, var(--accent));
      opacity: 0.45;
      transition:
        stroke-dashoffset 0.7s cubic-bezier(0.2, 0.7, 0.2, 1),
        opacity 0.2s;
    }

    /* The line crossed. A group's own full arc keeps the accent - whether
       one row of three is finished is not what the tile is scanned for -
       but the ring around them all takes the green every other finished
       thing in the app wears, and is the one part of the drawing that is
       meant to catch the eye. */
    .arc.on.outer.done {
      stroke: var(--ok);
      opacity: 1;
      filter: drop-shadow(0 0 4px var(--ok-line));
    }

    .hit {
      fill: none;
      stroke: transparent;
      pointer-events: stroke;
    }

    /* The arc under the pointer moves outward a little, and its track
       becomes a shade brighter. This shows which arc the tip is about. The
       fill keeps its colour, because that colour shows whether the group is
       done. */
    .seg {
      transform-box: view-box;
      transform-origin: 50% 50%;
      transition: transform 0.2s ease-out;
    }

    .seg.hover {
      transform: scale(1.035);
    }

    .seg.hover .arc:not(.on) {
      stroke: var(--border-hover);
    }

    /* The tip is above the ring, not in it. The content is in the middle,
       and a 40px ring has no room for words. */
    wt-tip {
      left: 50%;
      bottom: calc(100% + var(--s1));
      font-size: var(--fs-micro);
    }
  `

  @property({ attribute: false }) accessor groups: RingGroup[] = []
  /** One thin fill around the groups; null leaves the ring as its groups alone. */
  @property({ attribute: false }) accessor outer: RingGroup | null = null
  @property({ type: Number }) accessor size = 84
  /** Draws a dark plate under the ring, with a rim outside the arcs. */
  @property({ type: Boolean, reflect: true }) accessor disc = false
  /** A figure at the bottom of the ring, for example a level or a count. */
  @property() accessor badge: string | undefined = undefined

  /** The index of the group under the pointer, or undefined. */
  @state() accessor hovered: number | undefined = undefined
  /** Whether the pointer is on the outer ring, which has a tip of its own. */
  @state() accessor hoveredOuter = false
  /** False for the first frame, so the fills can animate from empty. */
  @state() accessor drawn = false

  protected override firstUpdated(): void {
    requestAnimationFrame(() => (this.drawn = true))
  }

  protected override willUpdate(): void {
    // The host and the badge take their size from it, so a large ring does
    // not carry a small figure.
    this.hostVar('--ring-size', `${this.size}px`)
  }

  /**
   * Finds the group under the pointer from the angle to the centre. The
   * stroke is only a few pixels wide, and the gaps between the arcs belong to
   * no group, so a hit test on the drawing is not precise enough. The pointer
   * is on the wide invisible circle under the arcs.
   */
  private track(event: PointerEvent): void {
    const count = this.groups.length
    if (count === 0) return
    const box = this.getBoundingClientRect()
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    const degrees = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    this.hovered = Math.min(Math.floor((degrees / 360) * count), count - 1)
  }

  protected override render(): TemplateResult {
    const size = this.size
    // The stroke follows the size, so every ring has the same weight for its
    // scale. The ring of a tile and the ring of a row are one shape in two sizes.
    const stroke = Math.max(4, Math.round(size / 14))
    const centre = size / 2
    // A shade lighter than the groups: present, but not the first thing the
    // eye meets on a board full of tiles.
    const outer = this.outer
    const outerStroke = Math.max(3, Math.round(stroke * 0.72))
    const outerRadius = (size - outerStroke) / 2 - (this.disc ? 2.5 : 0)
    // The groups move in by the outer ring and the air between the two. The
    // air is the gap the groups already keep from each other, so the whole
    // drawing is on one rhythm.
    const inset = outer ? outerStroke + RING_GAP * stroke : 0
    // On the plate, the arcs move in from the edge, so the rim stays visible.
    const radius = (size - stroke) / 2 - (this.disc ? 2.5 : 0) - inset
    // All values below are in degrees along the centre line of the stroke.
    const degreesPerPx = 360 / (2 * Math.PI * radius)
    const gap = GAP * stroke * degreesPerPx
    // A round cap extends half a stroke past the end of the path. The path
    // stops that distance before the end of the arc. Without this, the caps
    // fill the gaps, and a small ring becomes a full circle.
    const cap = (stroke / 2) * degreesPerPx

    const count = this.groups.length
    // One group is a closed ring. A gap would only show where it starts.
    const spacing = count > 1 ? gap : 0
    // The degrees for each arc, after all gaps have taken their share.
    const per = count > 0 ? (360 - count * spacing) / count : 0

    const gradients: TemplateResult[] = []
    const arcs: TemplateResult[] = []
    let at = spacing / 2

    this.groups.forEach((group, index) => {
      const share = Math.max(0, Math.min(group.percent, 100)) / 100
      // One group is the whole circle and closes; several keep their caps
      // out of each other's gaps. An arc too short for its caps becomes a
      // dot, not a reversed arc.
      const from = count === 1 ? 0 : at + cap
      const to = count === 1 ? WHOLE : Math.max(at + per - cap, from + 0.01)
      // The id is local to the shadow root, so two rings on a page do not meet.
      const id = `arc-${index}`
      // The fill becomes brighter along the arc, so a group that is further
      // has a brighter tip. The axis of the gradient ends at the middle of the
      // arc, not at its end. A closed ring ends where it starts, and an axis
      // with no length makes a seam there. An axis to the bottom shades the
      // ring evenly.
      const [x1, y1] = polar(centre, radius, from)
      const [x2, y2] = polar(centre, radius, (from + to) / 2)
      // A colour of its own still brightens along the arc, the way the
      // ring's own does: the same shape, in another hue.
      const stopFrom = group.color ? `hsl(${group.color})` : undefined
      const stopTo = group.color ? `color-mix(in oklab, hsl(${group.color}), white 16%)` : undefined
      gradients.push(
        svg`<linearGradient id=${id} gradientUnits="userSpaceOnUse" x1=${x1} y1=${y1} x2=${x2} y2=${y2}>
          <stop class="stop-from" offset="0" style=${stopFrom ? `stop-color: ${stopFrom}` : nothing}></stop>
          <stop class="stop-to" offset="1" style=${stopTo ? `stop-color: ${stopTo}` : nothing}></stop>
        </linearGradient>`
      )
      // Use `svg`, not `html`. A path from an html template is an HTML
      // element, and the svg cannot draw it. The track is always drawn. The
      // fill is the same arc with a dash of the share, so a change is a
      // transition. It is empty for the first frame, so the ring animates in.
      const path = arc(centre, radius, from, to)
      arcs.push(
        svg`<g class=${index === this.hovered ? 'seg hover' : 'seg'}>
          <path class="arc" d=${path} stroke-width=${stroke}></path>
          ${
            share > 0
              ? svg`<path
                class=${share >= 1 ? 'arc on full' : 'arc on'}
                d=${path}
                pathLength="100"
                stroke-width=${stroke}
                style=${`stroke: url(#${id}); stroke-dashoffset: ${this.drawn ? 100 - share * 100 : 100}; transition-delay: ${index * 90}ms`}
              ></path>`
              : nothing
          }
        </g>`
      )
      at += per + spacing
    })

    // One arc, so no gap: it would only show where the ring starts.
    const outerPath = arc(centre, outerRadius, 0, WHOLE)
    const outerShare = outer ? Math.max(0, Math.min(outer.percent, 100)) / 100 : 0
    const outerDone = outerShare >= 1
    // The outer ring answers first where it is drawn: its tip beats a group's.
    const hovered = this.hoveredOuter
      ? outer?.label
      : this.hovered === undefined
        ? undefined
        : this.groups[this.hovered]?.label
    // The hit band is four strokes wide around the centre line of the stroke.
    // It extends inside and outside the ring, but not to the content in the
    // middle.
    return html`
      <svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>
        <defs>${gradients}</defs>
        <circle
          class="hit"
          cx=${centre}
          cy=${centre}
          r=${radius}
          stroke-width=${outer ? stroke * 3 : stroke * 4}
          @pointermove=${this.track}
          @pointerleave=${() => (this.hovered = undefined)}
        ></circle>
        ${arcs}
        ${
          outer
            ? svg`<g class="outer">
                <path class="arc" d=${outerPath} stroke-width=${outerStroke}></path>
                ${
                  outerShare > 0
                    ? svg`<path
                        class=${outerDone ? 'arc on outer done' : 'arc on outer'}
                        d=${outerPath}
                        pathLength="100"
                        stroke-width=${outerStroke}
                        style=${`stroke-dashoffset: ${this.drawn ? 100 - outerShare * 100 : 100}`}
                      ></path>`
                    : nothing
                }
                <circle
                  class="hit"
                  cx=${centre}
                  cy=${centre}
                  r=${outerRadius}
                  stroke-width=${outerStroke * 3}
                  @pointermove=${() => (this.hoveredOuter = true)}
                  @pointerleave=${() => (this.hoveredOuter = false)}
                ></circle>
              </g>`
            : nothing
        }
      </svg>
      <div class="body"><slot></slot></div>
      ${this.badge !== undefined ? html`<span class="badge">${this.badge}</span>` : nothing}
      ${hovered ? html`<wt-tip>${hovered}</wt-tip>` : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-ring': WtRing
  }
}
