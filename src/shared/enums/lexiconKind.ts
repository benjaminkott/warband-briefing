/**
 * The tables of the lexicon: what the app keeps a number for, by id. Five
 * are the pictures the companion registers, one is what an item is. The
 * value is the table's name in the state.
 */
export enum LexiconKind {
  Item = 'item',
  Currency = 'currency',
  Recipe = 'recipe',
  Profession = 'profession',
  /** The character's id, by the character's key. */
  Portrait = 'portrait',
  /** The item's class and subclass as one code; see `itemCategory.ts`. */
  ItemClass = 'itemClass'
}
