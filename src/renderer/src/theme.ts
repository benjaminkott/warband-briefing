/**
 * Light or dark: the setting says which, or that the system decides. The
 * resolved theme is stamped on the document root as `data-theme`, which is
 * what the stylesheet's tokens switch on.
 */

import type { Theme } from '../../shared/types'
import { ThemeSetting } from '../../shared/enums/themeSetting'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The theme the setting comes to, given what the system prefers. */
export function resolveTheme(setting: ThemeSetting, systemDark: boolean): Theme {
  if (setting === ThemeSetting.System) return systemDark ? ThemeSetting.Dark : ThemeSetting.Light
  return setting
}

/** Stamps the theme on the document root, where the tokens read it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/**
 * Keeps the document's theme in step with a setting: applied now, and again
 * whenever the system preference changes while the setting follows it.
 * Returns the way to stop following.
 */
export function followTheme(setting: () => ThemeSetting): () => void {
  const media = window.matchMedia(DARK_QUERY)
  const apply = (): void => applyTheme(resolveTheme(setting(), media.matches))
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
