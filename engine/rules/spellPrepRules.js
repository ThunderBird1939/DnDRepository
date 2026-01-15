/**
 * Canonical spell ID generator
 * Used everywhere (prepared, always-prepared, spell list)
 */
export function spellIdFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Artificer prepared spell limit
 * = INT mod + half artificer level (min 1)
 */
export function artificerPrepLimit(character) {
  const intScore = character.abilities?.int ?? 10;
  const intMod = Math.floor((intScore - 10) / 2);
  const level = character.level ?? 1;

  return Math.max(1, intMod + Math.floor(level / 2));
}

/**
 * Max spell level an Artificer can cast by class level
 */
export function maxArtificerSpellLevel(level = 1) {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  return 5;
}
/**
 * Wizard prepared spell limit
 * = INT mod + wizard level (min 1)
 */
export function wizardPrepLimit(character) {
  const intScore = character.abilities?.int ?? 10;
  const intMod = Math.floor((intScore - 10) / 2);
  const level = character.level ?? 1;

  return Math.max(1, intMod + level);
}

/**
 * Max spell level Wizard can cast
 */
export function maxWizardSpellLevel(level = 1) {
  if (level >= 17) return 9;
  if (level >= 15) return 8;
  if (level >= 13) return 7;
  if (level >= 11) return 6;
  if (level >= 9) return 5;
  if (level >= 7) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

/**
 * Extract numeric spell level from tags
 * Matches: "1st level", "2nd level", etc
 */
export function spellLevelFromTags(tags = []) {
  const tag = tags.find(t =>
    /^\d+(st|nd|rd|th)\s+level$/i.test(t)
  );
  if (!tag) return null;

  // "1st level" -> 1
  return parseInt(tag, 10);
}

/**
 * Detect cantrips via tags
 */
export function isCantripFromTags(tags = []) {
  return tags.some(t => t.toLowerCase().includes("cantrip"));
}
