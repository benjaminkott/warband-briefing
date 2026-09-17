/**
 * What Wowhead's tooltip script needs to describe one item as it is: the
 * fields of the client's item link that change the tooltip - the bonus
 * ids (the upgrade track and the item level), the enchant, the gems, the
 * link level, the specialization. The script reads them off `data-wowhead="item=…&bonus=…"`
 * on a link; the sources write them at read time, so the renderer only
 * hands the string on.
 *
 * The link: `item:id:enchant:gem1:gem2:gem3:gem4:suffix:unique:level:
 * spec:modifiersMask:context:numBonus:bonus…:numModifiers:(type:value)…`.
 */

/** The `data-wowhead` value of an item link, or of an id alone; null for a link that is not an item's. */
export function wowheadItemParams(link: string | null | undefined, fallbackId?: number): string | null {
  const head = /\|Hitem:([^|]*)\|h/.exec(link ?? '')
  if (!head) return fallbackId && fallbackId > 0 ? `item=${fallbackId}` : null
  const fields = head[1]!.split(':')
  const num = (index: number): number => {
    const value = Number(fields[index])
    return Number.isInteger(value) && value > 0 ? value : 0
  }
  const itemId = num(0)
  if (!itemId) return null
  const parts = [`item=${itemId}`]
  const enchant = num(1)
  if (enchant) parts.push(`ench=${enchant}`)
  const gems = [num(2), num(3), num(4), num(5)].filter((id) => id > 0)
  if (gems.length) parts.push(`gems=${gems.join(':')}`)
  const level = num(8)
  if (level) parts.push(`lvl=${level}`)
  // The character's specialization at the time of the link: the tooltip then names the set bonus of that one, not of every spec of the class.
  const spec = num(9)
  if (spec) parts.push(`spec=${spec}`)
  const bonusCount = num(12)
  const bonuses = fields
    .slice(13, 13 + bonusCount)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
  if (bonuses.length) parts.push(`bonus=${bonuses.join(':')}`)
  return parts.join('&')
}
