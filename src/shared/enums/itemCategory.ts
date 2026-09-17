/**
 * What an item is: the game's own item classes (`Enum.ItemClass`), the
 * groups the client sorts a bag into and names in its tooltips. The value
 * is the word the fixtures and the stylesheet use; the number is the
 * client's, in `ITEM_CLASS_IDS`.
 */
export enum ItemCategory {
  Weapon = 'weapon',
  Armor = 'armor',
  Container = 'container',
  Consumable = 'consumable',
  Tradeskill = 'tradeskill',
  Reagent = 'reagent',
  Profession = 'profession',
  Recipe = 'recipe',
  Gem = 'gem',
  Enhancement = 'enhancement',
  Quest = 'quest',
  Key = 'key',
  Glyph = 'glyph',
  BattlePet = 'battlepet',
  Token = 'token',
  Misc = 'misc',
  /** A class the app has no word for: the client's newer ones, and the retired ones. */
  Other = 'other'
}

/** The order the groups stand in: what a character wears first, then what it uses, makes, and carries. */
export const ITEM_CATEGORY_ORDER: readonly ItemCategory[] = Object.values(ItemCategory)

/** The client's number for each class the app names. */
export const ITEM_CLASS_IDS: Readonly<Record<number, ItemCategory>> = {
  2: ItemCategory.Weapon,
  4: ItemCategory.Armor,
  1: ItemCategory.Container,
  0: ItemCategory.Consumable,
  7: ItemCategory.Tradeskill,
  5: ItemCategory.Reagent,
  19: ItemCategory.Profession,
  9: ItemCategory.Recipe,
  3: ItemCategory.Gem,
  8: ItemCategory.Enhancement,
  12: ItemCategory.Quest,
  13: ItemCategory.Key,
  16: ItemCategory.Glyph,
  17: ItemCategory.BattlePet,
  18: ItemCategory.Token,
  15: ItemCategory.Misc
}

/** The groups whose tiles say the item level, not the count. */
export const EQUIPMENT_CATEGORIES: readonly ItemCategory[] = [ItemCategory.Weapon, ItemCategory.Armor]
