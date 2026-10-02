/**
 * How the step reads on the tile: a reward to claim, a chore open, a chore
 * left over once the goals are met, the week done, or nothing to say.
 */
export enum StepTone {
  Claim = 'claim',
  Open = 'open',
  Extra = 'extra',
  Done = 'done',
  Quiet = 'quiet'
}
