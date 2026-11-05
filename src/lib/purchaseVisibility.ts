export const canTrackPurchases = (ownerId: string | null, memberId?: string): boolean =>
  Boolean(ownerId && memberId && ownerId !== memberId)
