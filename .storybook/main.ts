import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/web-components-vite'
import { scopeStyles } from './scope-styles'
import { LIT_ENTRIES, MAIN_PROCESS_PACKAGES } from './deps'

const config: StorybookConfig = {
  stories: ['../src/renderer/src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: { name: '@storybook/web-components-vite', options: {} },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: { ...(viteConfig.resolve?.alias ?? {}), '@shared': fileURLToPath(new URL('../src/shared', import.meta.url)) }
    },
    // The elements use standard decorators; see electron.vite.config.ts.
    esbuild: { ...(viteConfig.esbuild || {}), target: 'es2022' },
    // The app's stylesheet applies to the stories only, not to the docs' chrome.
    css: { ...viteConfig.css, postcss: { plugins: [scopeStyles(/[\\/]styles\.css$/)] } },
    // See deps.ts for why the entries are named up front.
    optimizeDeps: {
      ...viteConfig.optimizeDeps,
      include: [...(viteConfig.optimizeDeps?.include ?? []), ...LIT_ENTRIES],
      exclude: [...(viteConfig.optimizeDeps?.exclude ?? []), ...MAIN_PROCESS_PACKAGES]
    }
  })
}

export default config
