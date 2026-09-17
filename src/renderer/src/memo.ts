/**
 * The last result of a function, kept as long as it is called with the
 * same arguments - the same objects, not equal ones.
 *
 * The shell derives what its views draw (the roster with its skips, the
 * display flags) on every render. A derivation that returns a new object
 * each time makes every child see a changed property and draw again on
 * each tick of the clock; one that returns the same object until its
 * inputs change lets Lit skip the children that have nothing new.
 */
export function memoLast<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; result: R } | null = null
  return (...args: A): R => {
    if (last && last.args.length === args.length && last.args.every((arg, i) => arg === args[i])) return last.result
    const result = fn(...args)
    last = { args, result }
    return result
  }
}
