const SPELL_CACHE = {};

export async function loadSpellsForClass(classId) {
  if (!classId) return [];
  if (SPELL_CACHE[classId]) return SPELL_CACHE[classId];

  const url = new URL(`../../data/spells/${classId}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) {
    SPELL_CACHE[classId] = [];
    return SPELL_CACHE[classId];
  }
  const data = await res.json();
  const spells = data?.flat?.(10) ?? (Array.isArray(data) ? data : []);

  SPELL_CACHE[classId] = spells;
  return spells;
}

export function getSpellById(id, classId) {
  const cache = classId
    ? SPELL_CACHE[classId]
    : Object.values(SPELL_CACHE).flat();
  if (!cache?.length) return null;

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
