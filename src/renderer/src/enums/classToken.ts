/**
 * The classes the app knows a colour for - the fixed set an element's
 * `color` is picked from. The value of a member is the English class token
 * the addons save, so a snapshot's token compares to a member directly.
 */
export enum ClassToken {
  DeathKnight = 'DEATHKNIGHT',
  DemonHunter = 'DEMONHUNTER',
  Druid = 'DRUID',
  Evoker = 'EVOKER',
  Hunter = 'HUNTER',
  Mage = 'MAGE',
  Monk = 'MONK',
  Paladin = 'PALADIN',
  Priest = 'PRIEST',
  Rogue = 'ROGUE',
  Shaman = 'SHAMAN',
  Warlock = 'WARLOCK',
  Warrior = 'WARRIOR'
}

/** Blizzard's class colours, keyed by the class token. */
export const CLASS_COLORS: Record<ClassToken, string> = {
  [ClassToken.DeathKnight]: '#c41e3a',
  [ClassToken.DemonHunter]: '#a330c9',
  [ClassToken.Druid]: '#ff7c0a',
  [ClassToken.Evoker]: '#33937f',
  [ClassToken.Hunter]: '#aad372',
  [ClassToken.Mage]: '#3fc7eb',
  [ClassToken.Monk]: '#00ff98',
  [ClassToken.Paladin]: '#f48cba',
  [ClassToken.Priest]: '#ffffff',
  [ClassToken.Rogue]: '#fff468',
  [ClassToken.Shaman]: '#0070dd',
  [ClassToken.Warlock]: '#8788ee',
  [ClassToken.Warrior]: '#c69b6d'
}

/** Whether a token off a snapshot names a class the app knows. */
export function isClassToken(token: string | null | undefined): token is ClassToken {
  return token !== null && token !== undefined && Object.values(ClassToken).includes(token as ClassToken)
}

/** Short forms players use themselves - unambiguous, unlike a single letter. */
export const CLASS_ABBR: Record<ClassToken, string> = {
  [ClassToken.DeathKnight]: 'DK',
  [ClassToken.DemonHunter]: 'DH',
  [ClassToken.Druid]: 'DRU',
  [ClassToken.Evoker]: 'EVO',
  [ClassToken.Hunter]: 'HUN',
  [ClassToken.Mage]: 'MAG',
  [ClassToken.Monk]: 'MNK',
  [ClassToken.Paladin]: 'PAL',
  [ClassToken.Priest]: 'PRI',
  [ClassToken.Rogue]: 'ROG',
  [ClassToken.Shaman]: 'SHA',
  [ClassToken.Warlock]: 'WLK',
  [ClassToken.Warrior]: 'WAR'
}

export function classAbbr(token: string | null, className: string): string {
  if (isClassToken(token)) return CLASS_ABBR[token]
  return (className || '?').slice(0, 3).toUpperCase()
}

/**
 * The colour to paint a class in, as a CSS value: the stylesheet's token for
 * the class, with Blizzard's own colour as the fallback. The token is what
 * lets the light theme tone down the colours that were made for a dark
 * client - a white priest, a yellow rogue.
 */
export function classColor(token: string | null | undefined): string | undefined {
  return isClassToken(token) ? `var(--class-${token.toLowerCase()}, ${CLASS_COLORS[token]})` : undefined
}
