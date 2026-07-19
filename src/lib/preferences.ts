const waterKey = (userId: string) => `calo-show-water-${userId}`;

/** Preferensi tampil air: localStorage dulu, lalu kolom profil DB. */
export function getShowWaterTracker(
  userId: string | undefined,
  profileValue: boolean | null | undefined
): boolean {
  if (userId && typeof window !== 'undefined') {
    const local = localStorage.getItem(waterKey(userId));
    if (local === '0') return false;
    if (local === '1') return true;
  }
  if (profileValue == null) return true;
  return Boolean(profileValue);
}

export function setShowWaterTrackerLocal(userId: string, show: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(waterKey(userId), show ? '1' : '0');
}
