/** The four things a host can be for layout; see `WtElement.hostDisplay`. */
export enum HostDisplay {
  Block = 'block',
  Inline = 'inline',
  /** A row of cells in the light DOM, in a table that slots it. */
  TableRow = 'table-row',
  Contents = 'contents'
}
