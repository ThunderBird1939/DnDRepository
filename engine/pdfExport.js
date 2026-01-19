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
   SPELL HELPERS (CLASS JSON FORMAT)
========================= */

/**
 * Extracts the numeric spell level from your spell JSON `contents` subtitle:
 * - "subtitle | 1st-level abjuration" -> 1
 * - "subtitle | Conjuration cantrip"  -> 0
 */
function parseSpellLevelFromContents(contents = []) {
  const subtitleLine = (contents || []).find(l => typeof l === "string" && l.startsWith("subtitle |"));
  if (!subtitleLine) return null;

  const text = subtitleLine.split("|")[1]?.trim().toLowerCase() ?? "";

  if (text.includes("cantrip")) return 0;

  const m = text.match(/(\d+)(st|nd|rd|th)-level/);
  if (m) return Number(m[1]);

  return null;
}

/** Extract "property | <Name> | <Value>" from your spell JSON `contents`. */
function extractProperty(contents = [], propName) {
  const line = contents.find(l =>
    l.startsWith(`property | ${propName} |`)
  );

  if (!line) return "";

  let value = line.split("|").slice(2).join("|").trim();

  // 🔥 Trim reaction explanations
  if (propName === "Casting Time") {
    value = value.split(",")[0].trim();
  }

  return value;
}


function hasTag(spell, tag) {
  const t = (tag ?? "").toLowerCase();
  return (spell.tags ?? []).some(x => String(x).toLowerCase() === t);
}

function detectConcentration(spell) {
  // Some sources put it in Duration, others in tags.
  const duration = extractProperty(spell.contents ?? [], "Duration").toLowerCase();
  return duration.includes("concentration") || hasTag(spell, "concentration");
}

/**
 * Normalizes one spell JSON object into the minimal PDF-friendly shape.
 * Returns strings + booleans only (safe for PDFLib drawText).
 */
function normalizeSpellForPdf(spell) {
  const lvl = parseSpellLevelFromContents(spell.contents ?? []);
  return {
    id: spell.id ?? (spell.title?.toLowerCase().replace(/\s+/g, "-") ?? ""),
    name: spell.title ?? "",
    level: (typeof lvl === "number" ? lvl : null),  // 0 for cantrip, 1..9 for leveled, null if unknown
    castingTime: extractProperty(spell.contents ?? [], "Casting Time"),
    range: extractProperty(spell.contents ?? [], "Range"),
    ritual: hasTag(spell, "ritual"),
    concentration: detectConcentration(spell)
  };
}

/* =========================
   PDF DATA BUILDER
========================= */
export async function buildPdfCharacterData(character) {
  /* =========================
     HELPERS
  ========================= */
  const getAbilityScore = stat =>
    (Number(character.abilities?.[stat] ?? 10)) +
    (Number(character.appliedRaceAsi?.[stat] ?? 0));

  const abilityMod = v => Math.floor((v - 10) / 2);
  const proficiency = lvl => Math.ceil(1 + lvl / 4);

  const level = character.level || 1;
  const profBonus = proficiency(level);
  const weaponsIndex = await loadWeaponsIndex();

  const savingThrows = Object.entries(character.savingThrows || {})
    .filter(([_, isProficient]) => isProficient)
    .map(([ability]) => ability);
  const tools = [...(character.proficiencies?.tools ?? [])];
  function extractRaceProperty(contents = [], propName) {
    const line = contents.find(l =>
      l.startsWith(`property | ${propName} |`)
    );
    if (!line) return "";
    return line.split("|").slice(2).join("|").trim();
  }
  const skillAbilityMap = {
    athletics: "str",
    acrobatics: "dex",
    sleightOfHand: "dex",
    stealth: "dex",
    arcana: "int",
    history: "int",
    investigation: "int",
    nature: "int",
    religion: "int",
    animalHandling: "wis",
    insight: "wis",
    medicine: "wis",
    perception: "wis",
    survival: "wis",
    deception: "cha",
    intimidation: "cha",
    performance: "cha",
    persuasion: "cha"
  };

  /* =========================
    SPELLCASTING CALCS
  ========================= */
  let spellcastingModifier = null;
  let spellAttackBonus = null;
  let spellSaveDC = null;

  if (character.spellcasting?.enabled && character.spellcasting.ability) {
    const ability = character.spellcasting.ability; // "int" | "wis" | "cha"
    const mod = abilityMod(getAbilityScore(ability));

    spellcastingModifier = mod+ profBonus;
    spellAttackBonus = mod;
    spellSaveDC = 8 + mod + profBonus;
  }
    const wisScore = getAbilityScore("wis");
    const wisMod = abilityMod(wisScore);

    const perceptionProficient =
      character.proficiencies?.skills?.has("perception");

    const perceptionExpertise =
      character.proficiencies?.expertise?.has("perception");

    let perceptionBonus = wisMod;

    if (perceptionProficient) perceptionBonus += profBonus;
    if (perceptionExpertise) perceptionBonus += profBonus; // expertise adds prof again

    const passivePerception = 10 + perceptionBonus;

  /* =========================
    SPELL LISTS (PDF)
  ========================= */
  let cantrips = [];
  let preparedSpells = [];
  let availableSpells = [];

  if (character.spellcasting?.enabled && character.class?.id) {
    const res = await fetch(`./data/spells/${character.class.id}.json`);
    if (res.ok) {
      const classSpells = await res.json();

      const byId = id =>
        classSpells.find(s =>
          s.id === id ||
          s.title?.toLowerCase().replace(/\s+/g, "-") === id
        );

      // Selected cantrips only (normalized for PDF)
      cantrips = [...(character.spellcasting.cantrips ?? [])]
        .map(byId)
        .filter(Boolean)
        .map(normalizeSpellForPdf);

      // All available spells to prepare (normalized for PDF)
      availableSpells = [...(character.spellcasting.available ?? [])]
        .map(byId)
        .filter(Boolean)
        .map(normalizeSpellForPdf);

      // Keep prepared IDs for marking/highlighting in the PDF layer
      preparedSpells = [...(character.spellcasting.prepared ?? [])];
    }
  }
  const skills = {};

  for (const [skill, ability] of Object.entries(skillAbilityMap)) {
    const abilityScore = getAbilityScore(ability);
    let bonus = abilityMod(abilityScore);

    const proficient = character.proficiencies?.skills?.has(skill);
    const expertise = character.proficiencies?.expertise?.has(skill);

    if (proficient) bonus += profBonus;
    if (expertise) bonus += profBonus;

    skills[skill] = {
      bonus,
      proficient,
      expertise
    };
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
     RACE TRAITS
  ========================= */
  const raceTraits = (character.features || [])
    .filter(f => f.source === "race" && f.category === "race-trait")
    .map(f => ({
      name: f.name,
      description: f.description
    }));
  /* =========================
    ARMOR PROFICIENCIES (PDF)
  ========================= */
  const armorProficiencies = [
    ...(character.proficiencies?.armor ?? [])
  ];
  const raceSize = character.race?.contents
    ? extractRaceProperty(character.race.contents, "Size")
    : "";

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
    raceSize,
    abilities: {
      str: getAbilityScore("str"),
      dex: getAbilityScore("dex"),
      con: getAbilityScore("con"),
      int: getAbilityScore("int"),
      wis: getAbilityScore("wis"),
      cha: getAbilityScore("cha")
    },

    proficiencyBonus: profBonus,
    passivePerception,

    armorClass: character.combat?.armorClass,
    initiative: abilityMod(getAbilityScore("dex")),
    speed: character.combat?.speed,

    hitPoints: {
      max: character.hp?.max ?? ""
    },

    hitDie: character.hp?.hitDie ?? null,

    weapons,
    skills,
    // Spellcasting numbers
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
    ),

    raceTraits,
    savingThrows,

    // Spells
    cantrips,
    preparedSpells,
    availableSpells,

    armorProficiencies,
    tools
  };
}
