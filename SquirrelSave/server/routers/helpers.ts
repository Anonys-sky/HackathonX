/** Synthetic friend user id for social streak rows (no real OAuth friend). */
export function generateFriendId(userId: number): number {
  return -(userId * 10000 + (Date.now() % 10000));
}
