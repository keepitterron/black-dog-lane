// How long a line of text stays up: long enough for a 9-year-old to read it, scaled by length
// (about 12.6 s for a full 140-character line). The game's timeline and the message box share it.
export const messageMs = (text: string) => Math.max(4000, text.length * 90)
