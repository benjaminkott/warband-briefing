/**
 * A translator for the tests. The words are the keys with their parameters
 * (`tasks.vaultSlot(2,3)`, `dash.steps.gear(2)`), so a test checks the shape
 * of what a model names, not its text in a language. The figures are the
 * plain digits; the names sort as the German one sorts them.
 */

import { createTranslator, type Translator } from './index'

export function keysTranslator(): Translator {
  return {
    ...createTranslator('de'),
    t: (key, params) => (params ? `${key}(${Object.values(params).join(',')})` : key),
    plural: (key, count) => `${key}(${count})`,
    formatNumber: (value) => String(value)
  }
}
