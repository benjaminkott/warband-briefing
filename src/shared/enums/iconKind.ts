/**
 * What a game picture is of: the kinds the lexicon keeps a file id for,
 * the class, whose icon the client names by the class token, and the
 * character's portrait, which the host renders by the character's id. The
 * value is the word in the picture's address (`wt-icon://item/274374`).
 */
export enum IconKind {
  Item = 'item',
  Currency = 'currency',
  Recipe = 'recipe',
  Profession = 'profession',
  Class = 'class',
  /** The character's face, square; the reference is the character's key. */
  Portrait = 'portrait',
  /** The character's bust with its backdrop, twice as wide as high; the same reference. */
  Inset = 'inset'
}

/** Whether a word off an address is a kind. */
export function isIconKind(value: string | null | undefined): value is IconKind {
  return value !== null && value !== undefined && Object.values(IconKind).includes(value as IconKind)
}
