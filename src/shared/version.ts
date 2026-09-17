/**
 * Version order for the app and its addon.
 *
 * The addon carries the app's version. Once it is on CurseForge too, the
 * game folder can hold a version the app has not shipped yet - and the app
 * must not put its older copy over it. So "replace" means "older", and
 * older needs an order: numeric parts first, then a version with a
 * pre-release tag is older than the same version without one
 * (`0.1.0-beta.2 < 0.1.0`), and pre-release parts compare part by part,
 * numbers as numbers.
 */

const parse = (version: string): { parts: number[]; pre: string[] } => {
  const [core = '', pre = ''] = version.trim().replace(/^v/, '').split('-', 2)
  return {
    parts: core.split('.').map((part) => Number.parseInt(part, 10) || 0),
    pre: pre ? pre.split('.') : []
  }
}

const comparePart = (a: string, b: string): number => {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a < b ? -1 : a > b ? 1 : 0
}

/** Negative when `a` is older than `b`, zero when they are the same version. */
export function compareVersions(a: string, b: string): number {
  const va = parse(a)
  const vb = parse(b)
  for (let i = 0; i < Math.max(va.parts.length, vb.parts.length); i++) {
    const diff = (va.parts[i] ?? 0) - (vb.parts[i] ?? 0)
    if (diff !== 0) return diff
  }
  if (va.pre.length === 0 && vb.pre.length === 0) return 0
  if (va.pre.length === 0) return 1
  if (vb.pre.length === 0) return -1
  for (let i = 0; i < Math.max(va.pre.length, vb.pre.length); i++) {
    const pa = va.pre[i]
    const pb = vb.pre[i]
    if (pa === undefined) return -1
    if (pb === undefined) return 1
    const diff = comparePart(pa, pb)
    if (diff !== 0) return diff
  }
  return 0
}
