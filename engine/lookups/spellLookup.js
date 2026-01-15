const SPELL_CACHE = {};

export async function loadSpellsForClass(classId) {
  if (SPELL_CACHE[classId]) return SPELL_CACHE[classId];

  const res = await fetch(`./data/spells/${classId}.json`);
  const spells = (await res.json()).flat?.(10) ?? [];

  SPELL_CACHE[classId] = spells;
  return spells;
}

export function getSpellById(id, classId) {
  const cache = SPELL_CACHE[classId];
  if (!cache) return null;

  return cache.find(
    s =>
      s.title &&
      s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === id
  );
}

export function spellUsableByClass(spell, classId) {
  if (!Array.isArray(spell.tags)) return false;

  return spell.tags.some(
    t => t.toLowerCase() === classId.toLowerCase()
  );
}

export function isRitualSpell(spell) {
  return (
    spell.contents?.some(line =>
      line.toLowerCase().includes("ritual")
    ) ||
    spell.tags?.some(t => t.toLowerCase() === "ritual")
  );
}
