/**
 * What Vite's dependency optimizer is told up front, for Storybook's own
 * server and for the story project of vitest.config.ts.
 *
 * Vite's first scan does not see `lit/directive-helpers.js`, which the
 * renderer's docs entry reaches only at run time. Served raw, it brings a
 * second lit-html into a page that already holds the bundled one, and Lit
 * warns "Multiple versions of Lit loaded". Named here, every entry is in
 * the one bundle from the start. The main process's packages are never for
 * the browser; excluded, a stray import does not trigger a re-optimisation
 * and a reload in the middle of a run.
 */

export const LIT_ENTRIES = [
  'lit',
  'lit/decorators.js',
  'lit/directive.js',
  'lit/directive-helpers.js',
  'lit/directives/class-map.js',
  'lit/directives/if-defined.js',
  'lit/directives/keyed.js',
  'lit/directives/ref.js',
  'lit/directives/repeat.js',
  'lit/directives/style-map.js',
  '@lit/context'
]

export const MAIN_PROCESS_PACKAGES = ['electron', 'electron-updater']
