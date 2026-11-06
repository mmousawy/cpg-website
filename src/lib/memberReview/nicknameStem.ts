/** Lowercase nickname with trailing digits removed (repeat detection). */
export function nicknameStem(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/[0-9]+$/, '');
}

export function nicknameStemsMatch(a: string, b: string): boolean {
  const stemA = nicknameStem(a);
  const stemB = nicknameStem(b);
  const minLen = Math.min(stemA.length, stemB.length);
  if (minLen < 4) {
    return stemA === stemB && minLen >= 4;
  }
  return stemA === stemB || stemA.startsWith(stemB) || stemB.startsWith(stemA);
}
