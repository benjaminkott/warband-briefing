/**
 * The size of an icon: one of the five steps of the icon scale in
 * `styles.css` (`--icon-xs` … `--icon-xl`). An icon beside small type is
 * `Xs`, one in a line of body type or on a control is `Sm`, one that heads
 * a panel or a view is `Md`; the two large ones are for a medallion. A
 * template writes the member, never a number of pixels.
 */
export enum IconSize {
  Xs = 'xs',
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Xl = 'xl'
}
