/**
 * Describes the `wt-*` elements for Storybook's autodocs: the analyzer reads
 * the properties, their JSDoc and the events out of the sources and writes
 * custom-elements.json, which .storybook/preview.ts hands to Storybook.
 */

/**
 * Storybook lists every member the manifest has, private ones and the
 * elements' own `@state` included, which is noise on a docs page: nothing a
 * user of the element can set. They are dropped here before the manifest is
 * written.
 */
function hideInternals() {
  /** class name -> member names that are internal */
  const internal = new Map()
  return {
    name: 'briefing:hide-internals',
    analyzePhase({ ts, node }) {
      if (!ts.isClassDeclaration(node) || !node.name) return
      const names = new Set()
      for (const member of node.members) {
        const decorators = ts.canHaveDecorators(member) ? (ts.getDecorators(member) ?? []) : []
        const isState = decorators.some((d) => d.expression.getText().startsWith('state('))
        const isPrivate = (member.modifiers ?? []).some(
          (m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
        )
        if ((isState || isPrivate) && member.name) names.add(member.name.getText())
      }
      internal.set(node.name.getText(), names)
    },
    packageLinkPhase({ customElementsManifest }) {
      for (const module of customElementsManifest.modules) {
        for (const declaration of module.declarations ?? []) {
          const names = internal.get(declaration.name)
          if (!names || !declaration.members) continue
          declaration.members = declaration.members.filter(
            (member) => !member.static && !names.has(member.name) && member.privacy !== 'private' && member.privacy !== 'protected'
          )
        }
      }
    }
  }
}

export default {
  globs: ['src/renderer/src/components/**/*.ts', 'src/renderer/src/App.ts', 'src/renderer/src/i18n.ts'],
  exclude: ['**/*.stories.ts', '**/*.test.ts'],
  outdir: '.',
  litelement: true,
  plugins: [hideInternals()]
}
