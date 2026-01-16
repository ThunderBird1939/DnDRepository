/* =========================
   WEAPONS DATA LOADER
========================= */
let WEAPONS_INDEX = null;

async function loadWeaponsIndex() {
  if (WEAPONS_INDEX) return WEAPONS_INDEX;

  const res = await fetch("./data/weapons.all.json");
  if (!res.ok) throw new Error("Failed to load weapons data");

  WEAPONS_INDEX = await res.json();
  return WEAPONS_INDEX;
}

/* =========================
   PDF DATA BUILDER
========================= */
export async function buildPdfCharacterData(character) {
  /* =========================
     HELPERS
  ========================= */
  const abilityMod = v => Math.floor((v - 10) / 2);
  const proficiency = lvl => Math.ceil(1 + lvl / 4);

  const level = character.level || 1;
  const profBonus = proficiency(level);
  const weaponsIndex = await loadWeaponsIndex();

    /* =========================
    SPELLCASTING CALCS
    ========================= */
    let spellcastingModifier = null;
    let spellAttackBonus = null;
    let spellSaveDC = null;

    if (character.spellcasting?.enabled && character.spellcasting.ability) {
    const ability = character.spellcasting.ability; // "int" | "wis" | "cha"
    const mod = abilityMod(character.abilities?.[ability] ?? 10);

    spellcastingModifier = mod;
    spellAttackBonus = mod + profBonus;
    spellSaveDC = 8 + mod + profBonus;
    }

  /* =========================
     RESOLVE WEAPONS
  ========================= */
  const weapons = (character.weapons || [])
    .map(id => weaponsIndex.find(w => w.id === id))
    .filter(Boolean)
    .map(w => {
      // ---- Ability ----
      const hasFinesse = w.properties?.some(p =>
        p.toLowerCase().includes("finesse")
      );
      const isRanged = w.category?.toLowerCase().includes("ranged");
      const ability = hasFinesse || isRanged ? "dex" : "str";

      // ---- Proficiency ----
      const weaponProfs = character.proficiencies?.weapons ?? new Set();
      const category = w.category?.toLowerCase() ?? "";

      const proficient =
        weaponProfs.has(w.id) ||
        weaponProfs.has(category) ||
        (category.includes("simple") && weaponProfs.has("simple")) ||
        (category.includes("martial") && weaponProfs.has("martial"));

      // ---- Damage ----
      const dmg = Array.isArray(w.damage) ? w.damage[0] : null;

      return {
        id: w.id,
        name: w.name,
        ability,
        proficient,
        damage: dmg?.dice ?? "",
        damageType: dmg?.type ?? ""
      };
    });

  /* =========================
     RETURN SNAPSHOT
  ========================= */
  return {
    name: character.name,
    class: character.class?.name,
    subclass: character.subclass?.name,
    level,
    background: character.background?.name,
    species: character.race?.name,

    abilities: character.abilities,

    proficiencyBonus: profBonus,

    armorClass: character.combat?.armorClass,
    initiative: abilityMod(character.abilities?.dex ?? 10),
    speed: character.combat?.speed,

    hitPoints: {
      max: character.hp?.max ?? ""
    },

    hitDie: character.hp?.hitDie ?? null,

    weapons,

    // ✅ NOW RELIABLE
    spellcastingModifier,
    spellAttackBonus,
    spellSaveDC,
    spellSlots: character.spellcasting?.enabled
  ? character.spellcasting.slots?.max ?? {}
  : {},

    
    classFeatures: character.features.filter(
      f => f.source === character.class?.id
    ),

    subclassFeatures: character.features.filter(
      f => f.source === character.subclass?.id
    )
  };
}
