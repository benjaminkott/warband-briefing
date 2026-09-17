import type { Plugin } from 'postcss'

/** The roots a story renders into: the canvas, and each story block on a docs page. */
const SCOPE = ':where(#storybook-root, .sb-story)'

/**
 * Keep the app's stylesheet inside the stories. It styles elements by tag -
 * `button`, `input`, `a` - because the app is the only page it runs on. On
 * a docs page those rules also hit Storybook's own controls (the radio
 * buttons of the controls table, its links). So every selector of
 * `styles.css` gets the story roots in front, in `:where()` so specificity
 * does not change. The tokens on `:root` stay global: the theme is stamped
 * on the root, and the preview head reads `--page-bg` from it. `body` is
 * the story root itself; its ground comes from the preview head, not from
 * this rule, so the ground declarations are dropped.
 */
export function scopeStyles(file: RegExp): Plugin {
  return {
    postcssPlugin: 'wt-scope-styles',
    Once(root) {
      if (!file.test(root.source?.input.file ?? '')) return
      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && /keyframes$/.test((rule.parent as { name: string }).name)) return
        rule.selectors = rule.selectors.map((selector) => {
          if (selector.startsWith(':root')) return selector
          if (selector === 'body') {
            rule.walkDecls(/^(background|margin)/, (decl) => {
              decl.remove()
            })
            return SCOPE
          }
          return `${SCOPE} ${selector}`
        })
      })
    }
  }
}
