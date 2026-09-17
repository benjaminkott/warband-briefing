/**
 * Small formatters every view shares: a figure as a whole number, a run's
 * duration, the one-line description of a run, the time left on a lockout.
 * They take the translator rather than reading it from context, so the maths
 * modules and the tests can call them too.
 */

import { splitDuration } from '../../../shared/time'
import type { Translator } from '../../../shared/i18n'

/** A figure the way every view sets it: rounded, grouped - or a dash for none. */
export function whole(tr: Translator, value: number | null | undefined): string {
  return value ? tr.formatNumber(Math.round(value)) : '—'
}

/** Copper as whole gold, or a dash when the source did not report a purse. */
export function goldOf(tr: Translator, copper: number | null): string {
  return copper !== null && copper > 0 ? tr.formatNumber(Math.floor(copper / 10000)) : '—'
}

/** "12:34 min" - how long a run took. */
export function formatDuration(tr: Translator, seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return tr.t('run.duration', { minutes, seconds: rest < 10 ? `0${rest}` : String(rest) })
}

/** "40 min", "1 h 30 min", "2 h" - what a step of the week takes. */
export function formatMinutes(tr: Translator, minutes: number): string {
  const whole = Math.round(minutes)
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (hours === 0) return tr.t('time.minutes', { count: tr.formatNumber(rest) })
  if (rest === 0) return tr.t('time.hours', { count: tr.formatNumber(hours) })
  return tr.t('time.hoursMinutes', { hours: tr.formatNumber(hours), minutes: tr.formatNumber(rest) })
}

/** The dungeon of a run, or the generic name when the source only knew the id. */
export function runName(tr: Translator, run: { dungeon: string | null; mapChallengeModeId: number }): string {
  return run.dungeon || tr.t('map.generic', { id: run.mapChallengeModeId })
}

/** "Tue 20:15" - a moment this week, the way run lists and event chips set it. */
export function formatWhen(tr: Translator, timestamp: number): string {
  return tr.formatDateTime(timestamp, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Time left until a lockout resets, measured from `now`. */
export function untilReset(tr: Translator, timestamp: number | null, now = Date.now()): string | null {
  if (!timestamp) return null
  const ms = timestamp - now
  if (ms <= 0) return tr.t('lockout.expired')
  const { days, hours, minutes } = splitDuration(ms)
  if (days > 0) return tr.t('lockout.resetInDays', { days, hours })
  if (hours > 0) return tr.t('lockout.resetInHours', { hours, minutes })
  return tr.t('lockout.resetInMinutes', { minutes })
}

/** "+12" / "-3" - a change with its sign, the way every trend reads it out. */
export function signed(tr: Translator, change: number): string {
  return `${change > 0 ? '+' : ''}${tr.formatNumber(change)}`
}

/** A part of a whole as a percentage, rounded, the way the bars caption it. */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}
