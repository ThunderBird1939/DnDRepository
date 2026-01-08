let SPELL_CACHE = null;

export async function loadSpellsForClass(classId) {
  if (SPELL_CACHE) return SPELL_CACHE;

  const res = await fetch(`./data/spells/${classId}.json`);
  SPELL_CACHE = (await res.json()).flat?.(10) ?? [];
  return SPELL_CACHE;
}

export function getSpellById(id) {
  if (!SPELL_CACHE) return null;
  return SPELL_CACHE.find(
    s => s.title && s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === id
  );
}
