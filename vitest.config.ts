import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { LIT_ENTRIES, MAIN_PROCESS_PACKAGES } from './.storybook/deps'

/**
 * Two projects. `unit` runs every `<module>.test.ts` beside its module under
 * node: the tests import the sources as they are, through Vite, so no test
 * builds a bundle of its own first. `storybook` renders every story in a
 * headless Chrome: each is a smoke test of its element, and a `play`
 * function is an interaction test.
 */
export default defineConfig({
  resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  // The elements use standard decorators; see electron.vite.config.ts.
  esbuild: { target: 'es2022' },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', '.storybook/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // The Chrome on the machine; no browser download of its own.
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium' }]
          },
          // The entries of Lit the sources and Storybook's renderer import,
          // named up front (see .storybook/main.ts): Vitest keeps its own
          // list for the browser and does not read `optimizeDeps` from the
          // Storybook config.
          deps: { optimizer: { client: { include: LIT_ENTRIES, exclude: MAIN_PROCESS_PACKAGES } } }
        }
      }
    ]
  }
})
