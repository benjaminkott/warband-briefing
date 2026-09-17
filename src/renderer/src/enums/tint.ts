/**
 * The colours beyond the four severities: a thing painted for what it is,
 * not for how it is to be read. `Gold` is gold, `Accent` the one highlight
 * of the app, `Key` the keystone's own colour, `Quiet` the faint ink of a
 * mark that must not draw the eye.
 *
 * Each is one token family in the stylesheet (`--gold`, `--accent`,
 * `--key`; `Quiet` takes the faint text ink) and one word on a host, the
 * same way a severity is. A tone type is a union of members from here and
 * from `Severity` - the chip takes both, the trend line three of these, a
 * figure gold or the warning ink - so every colour word in the app is one
 * of eight.
 */
export enum Tint {
  Gold = 'gold',
  Accent = 'accent',
  Key = 'key',
  Quiet = 'quiet'
}

/** The custom property a tint paints with; `Quiet` is the faint text ink. */
export const TINT_VAR: Record<Tint, string> = {
  [Tint.Gold]: 'var(--gold)',
  [Tint.Accent]: 'var(--accent)',
  [Tint.Key]: 'var(--key)',
  [Tint.Quiet]: 'var(--text-faint)'
}
