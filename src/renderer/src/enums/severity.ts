import type { IconName } from '../components/Icon'

/**
 * How a thing is to be read, from quiet to loud. `Info` is the neutral
 * word, `Ok` a thing that is finished or in order, `Warn` one that wants a
 * look, `Danger` a fault or a loss.
 *
 * Each severity is one family of tokens in the stylesheet - `--ok` for the
 * mark, `--ok-text` for the ink on a wash, `--ok-soft` for the wash,
 * `--ok-line` for the edge - and one class of the same name on the host
 * that carries it. The value of a member is that name, so a `tone`
 * attribute and a host class read the same word. The notice, the chip, the
 * button, the bar and the trend all take theirs from here, so a warning is
 * one colour wherever it is raised. `Info` has no class: the neutral look
 * is the element's own.
 */
export enum Severity {
  Info = 'info',
  Ok = 'ok',
  Warn = 'warn',
  Danger = 'danger'
}

/** The mark that says the severity for a reader who cannot tell the colours apart. */
export const SEVERITY_ICON: Record<Severity, IconName> = {
  [Severity.Info]: 'info',
  [Severity.Ok]: 'check',
  [Severity.Warn]: 'alert',
  [Severity.Danger]: 'alert'
}

/**
 * The host classes of a severity: one of its own name, none for `Info`.
 * Takes any tone, so an element whose palette is wider than the four
 * (the chip) passes its tone through and keeps its other classes.
 */
export function severityClasses(tone: string | undefined): Record<Exclude<Severity, Severity.Info>, boolean> {
  return { [Severity.Ok]: tone === Severity.Ok, [Severity.Warn]: tone === Severity.Warn, [Severity.Danger]: tone === Severity.Danger }
}
