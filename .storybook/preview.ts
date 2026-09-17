import { setCustomElementsManifest, type Preview } from '@storybook/web-components-vite'
import { withActions } from 'storybook/actions/decorator'
import { themes } from 'storybook/theming'
import { html } from 'lit'
import { storySource, type SourceContext } from './lit-source'
import { applyTheme, resolveTheme } from '../src/renderer/src/theme'
import '../src/renderer/src/styles.css'
import '../src/renderer/src/i18n'
import './mock-api'
import '../src/renderer/src/components/ui/TipLayer'

// Vite's dev server serves Lit's development build, and Lit says so once
// per page - in a test run, once per story file. The notice is right and
// known; Lit's own switch is its code in this set (https://lit.dev/msg/dev-mode).
;((globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings ??= new Set()).add('dev-mode')

// The elements' properties, attributes and events for the docs pages, as
// `cem analyze` wrote them (see custom-elements-manifest.config.mjs). Read
// through a glob so a missing file is an empty docs table, not a build error.
const manifests = import.meta.glob('../custom-elements.json', { eager: true, import: 'default' })
for (const manifest of Object.values(manifests)) setCustomElementsManifest(manifest as object)

/** Every event the elements raise, so the actions panel logs them all. */
const EVENTS = [
  'wt-open-character',
  'wt-open-gold',
  'wt-toggle',
  'wt-change',
  'wt-query',
  'wt-filter',
  'wt-sort',
  'wt-sort-column',
  'wt-view',
  'wt-stats',
  'wt-collapsed',
  'wt-account',
  'wt-range',
  'wt-section',
  'wt-back',
  'wt-prev',
  'wt-next',
  'wt-install-update',
  'wt-check-update',
  'wt-choose-wow-path',
  'wt-config',
  'wt-toggle-source',
  'wt-toggle-character',
  'wt-toggle-account',
  'wt-tasks-filter',
  'wt-tasks-grouping'
]

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Light or dark',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Dunkel', icon: 'moon' },
          { value: 'light', title: 'Hell', icon: 'sun' },
          { value: 'system', title: 'Wie das System', icon: 'browser' }
        ],
        dynamicTitle: true
      }
    },
    locale: {
      description: 'UI language',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'de', title: 'Deutsch' },
          { value: 'en', title: 'English' }
        ],
        dynamicTitle: true
      }
    }
  },
  initialGlobals: { theme: 'dark', locale: 'de' },
  // The vitest browser mounts a story into a bare `div` of the body, not
  // into `#storybook-root`. The canvas takes the class of a docs block, so
  // the scoped stylesheet (scope-styles.ts) reaches the story there too.
  beforeEach: ({ canvasElement }) => {
    canvasElement.classList.add('sb-story')
  },
  decorators: [
    // The theme is stamped on the root the way the app shell stamps it, so
    // the tokens - and so every element - switch with the toolbar.
    (story, context) => {
      applyTheme(resolveTheme(context.globals.theme ?? 'dark', window.matchMedia('(prefers-color-scheme: dark)').matches))
      return story()
    },
    // The same provider the app shell is, so every story reads the
    // translator from context the way the running app does - and the same
    // tooltip layer, so a `data-tip` in a story shows on hover.
    (story, context) => html`<wt-i18n-provider locale=${context.globals.locale}>${story()}</wt-i18n-provider><wt-tip-layer></wt-tip-layer>`,
    withActions
  ],
  parameters: {
    // The page ground comes from the app's own stylesheet (preview-head.html);
    // the docs' chrome around it is Storybook's dark theme, which the
    // manager wears too.
    backgrounds: { disable: true },
    docs: {
      theme: themes.dark,
      // The code block is open under every story and shows the story's
      // template as it is written, bindings included, not the DOM that the
      // decorators rendered (lit-source.ts).
      canvas: { sourceState: 'shown' },
      source: { transform: (_code: string, context: unknown) => storySource(context as SourceContext) }
    },
    actions: { handles: EVENTS },
    controls: { expanded: true },
    // A group is a folder of components/, from the bottom up: the
    // foundations, the primitives of ui/, the shared elements at the top of
    // the folder, the parts of each view in its folder, the views, the
    // shell. Inside a group the stories are in name order, so an element is
    // where its file says.
    options: {
      storySort: {
        method: 'alphabetical',
        order: [
          'Foundations',
          'UI',
          'Shared',
          'Card',
          'Dashboard',
          'Detail',
          'Renown',
          'Settings',
          'Tasks',
          'Topbar',
          'Vault',
          'Views',
          'App'
        ]
      }
    }
  }
}

export default preview
