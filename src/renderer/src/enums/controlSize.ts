import { IconSize } from './iconSize'

/**
 * How tall a control is: the control height, the small one of a row
 * action, the tiny one inside a field. A button, a text field and a
 * select share the scale, so a row of them stands at one height.
 */
export enum ControlSize {
  Md = 'md',
  Sm = 'sm',
  Xs = 'xs'
}

/** The mark follows the box: one size for each control size, alone or beside a label. */
export const CONTROL_ICON: Record<ControlSize, IconSize> = {
  [ControlSize.Md]: IconSize.Sm,
  [ControlSize.Sm]: IconSize.Sm,
  [ControlSize.Xs]: IconSize.Xs
}
