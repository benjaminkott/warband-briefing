/**
 * The shell's clock as a context: one number, the time of the last tick,
 * provided by the app once a minute. An element that shows a relative
 * time ("40 min ago") reads it instead of `Date.now()`, so the words move
 * with the clock and not only when the data around them changes - the data
 * is fetched on events now, not on a timer.
 */

import { createContext } from '@lit/context'

export const clockContext = createContext<number>(Symbol('briefing.clock'))
