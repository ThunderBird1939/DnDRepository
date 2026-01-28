// engine/rules/barbarian.js

export function getRageStats(level) {
  if (level >= 20) return { uses: Infinity, bonus: 4 };
  if (level >= 16) return { uses: 6, bonus: 4 };
  if (level >= 12) return { uses: 5, bonus: 3 };
  if (level >= 6)  return { uses: 4, bonus: 2 };
  if (level >= 3)  return { uses: 3, bonus: 2 };
  return { uses: 2, bonus: 2 };
}

export function getBrutalCriticalDice(level) {
  if (level >= 17) return 3;
  if (level >= 13) return 2;
  if (level >= 9) return 1;
  return 0;
}
