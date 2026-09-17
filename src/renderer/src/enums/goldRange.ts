/** How far back the gold chart looks; the value is the segmented control's word. */
export enum GoldRange {
  Week = '7d',
  Month = '30d',
  Quarter = '90d',
  All = 'all'
}

export const GOLD_RANGES: readonly GoldRange[] = Object.values(GoldRange)
