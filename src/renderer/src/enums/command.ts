/**
 * What a key stroke asks for. The shell carries out the ones that move
 * between screens; a view carries out the ones that only mean something
 * on it (the search box, the character page's neighbours).
 */
export enum Command {
  Back = 'back',
  Forward = 'forward',
  OpenTab = 'open-tab',
  LastTab = 'last-tab',
  NextTab = 'next-tab',
  PrevTab = 'prev-tab',
  Reread = 'reread',
  Search = 'search',
  ClosePage = 'close-page',
  PrevCharacter = 'prev-character',
  NextCharacter = 'next-character'
}
