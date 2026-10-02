import type { Preview } from '@storybook/web-components-vite'
import { html, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'

/** The size a story renders at: `parameters.frame` on a meta or a story, in pixels. */
export interface Frame {
  width?: number
  height?: number
}

/** The window widths the app knows: the narrowest the main process allows, the default, a wide one. */
export const WINDOW_WIDTHS = { narrowest: 760, default: 1320, wide: 2200 } as const

/** The toolbar value for "the width the story sets". */
const AUTO = 'auto'

export const frameGlobalTypes: Preview['globalTypes'] = {
  frameWidth: {
    description: 'Width of the story',
    toolbar: {
      icon: 'grow',
      title: 'Breite',
      items: [
        { value: AUTO, title: 'Wie die Story' },
        { value: String(WINDOW_WIDTHS.narrowest), title: `Schmalstes Fenster (${WINDOW_WIDTHS.narrowest}px)` },
        { value: '1000', title: '1000px' },
        { value: String(WINDOW_WIDTHS.default), title: `Standardfenster (${WINDOW_WIDTHS.default}px)` },
        { value: '1700', title: '1700px' },
        { value: String(WINDOW_WIDTHS.wide), title: `Breites Fenster (${WINDOW_WIDTHS.wide}px)` }
      ],
      dynamicTitle: true
    }
  }
}

export const frameGlobals = { frameWidth: AUTO }

/** The story's frame with the toolbar over it: a width picked there beats the story's own. */
export const resolveFrame = (own: Frame | undefined, globals: Record<string, unknown>): Frame => ({
  width: typeof globals.frameWidth === 'string' && globals.frameWidth !== AUTO ? Number(globals.frameWidth) : own?.width,
  height: own?.height
})

/**
 * Wraps the story in a box of the frame's size; without a size the story
 * takes the canvas width. The width is fixed, not a maximum: a narrow docs
 * column scrolls instead of squeezing the story into a size it does not
 * have in the app.
 */
export const frameStory = <T>(story: T, frame: Frame): T | TemplateResult => {
  if (frame.width === undefined && frame.height === undefined) return story
  const style = {
    width: frame.width === undefined ? undefined : `${frame.width}px`,
    height: frame.height === undefined ? undefined : `${frame.height}px`
  }
  return html`<div class="sb-frame" style=${styleMap(style)}>${story}</div>`
}
