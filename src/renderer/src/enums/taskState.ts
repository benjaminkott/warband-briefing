/** What the sources say about a chore. */
export enum TaskState {
  Open = 'open',
  Ready = 'ready',
  Done = 'done',
  /**
   * Open on this character, paid to another: the quest pays once for the
   * account and a different character collected it (`weeklyTask.ts`).
   * Not asked, not done; no count holds it.
   */
  Paid = 'paid'
}
