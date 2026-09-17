/** The regions the companion addon can name; the value is the client's own word. */
export enum Region {
  Eu = 'eu',
  Us = 'us',
  Kr = 'kr',
  Tw = 'tw'
}

export const REGIONS: readonly Region[] = Object.values(Region)
