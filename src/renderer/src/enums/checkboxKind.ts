/**
 * The shapes a checkbox comes in: a settings row, a column switch, a menu
 * row, a line of the task list - or the box alone, without a label around it.
 */
export enum CheckboxKind {
  CheckRow = 'check-row',
  CharSwitch = 'char-switch',
  PopoverRow = 'popover-row',
  TaskRow = 'task-row',
  Plain = 'plain'
}
