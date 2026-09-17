import { LitElement, nothing, type PropertyValues } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { createContext, provide } from '@lit/context'
import { createTranslator, type Locale, type Translator } from '../../shared/i18n'

/**
 * The bound translator, handed down the tree as a context rather than
 * threaded through properties: every element that says anything takes it
 * from the nearest provider above it - the app shell, or a story's wrapper.
 */
export const translatorContext = createContext<Translator>(Symbol('briefing.translator'))

/**
 * What an element reads until a provider answers. One instance for the whole
 * app: a translator owns Intl formatters, which are not cheap to build.
 */
export const DEFAULT_TRANSLATOR: Translator = createTranslator('en')

/** "5 minutes ago" style label, localized. */
export function relativeTime(tr: Translator, timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return tr.t('time.never')
  const minutes = Math.round((now - timestamp) / 60_000)
  if (minutes < 2) return tr.t('time.justNow')
  if (minutes < 60) return tr.t('time.minutesAgo', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 48) return tr.t('time.hoursAgo', { count: hours })
  return tr.t('time.daysAgo', { count: Math.round(hours / 24) })
}

/**
 * A provider on its own, for whatever is not the app shell - Storybook wraps
 * every story in one. It renders nothing of its own: the children the parent
 * template put inside it stay where they are and read the context from here.
 */
@customElement('wt-i18n-provider')
export class WtI18nProvider extends LitElement {
  @property() accessor locale: Locale = 'en'

  @provide({ context: translatorContext })
  accessor translator: Translator = DEFAULT_TRANSLATOR

  protected override createRenderRoot(): HTMLElement {
    return this
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // Rebuilding on every update would throw away the Intl formatters.
    if (changed.has('locale')) this.translator = createTranslator(this.locale)
  }

  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-i18n-provider': WtI18nProvider
  }
}
