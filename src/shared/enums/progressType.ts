/** How an entry of the addon's catalog counts: one quest, any of them, a list with a threshold, or its own code. */
export enum ProgressType {
  Single = 'single',
  Any = 'any',
  List = 'list',
  Custom = 'custom'
}
