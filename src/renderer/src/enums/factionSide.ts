/**
 * The side a character is on. The client names factions in English no
 * matter the locale, and every source hands the token on untouched, so the
 * value is that token; the tag translates it and takes it as its colour
 * class.
 */
export enum FactionSide {
  Alliance = 'Alliance',
  Horde = 'Horde',
  Neutral = 'Neutral'
}

/** Whether a token off a snapshot names a side the app knows. */
export function isFactionSide(faction: string | null | undefined): faction is FactionSide {
  return faction !== null && faction !== undefined && Object.values(FactionSide).includes(faction as FactionSide)
}
