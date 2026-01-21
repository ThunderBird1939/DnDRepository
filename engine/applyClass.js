export async function applyClass(character, classData, level = 1) {
  if (!classData) return;

  /* =========================
      ENSURE STRUCTURE (CRITICAL)
   ========================= */

  character.class ??= {};
  character.features ??= [];

  character.proficiencies ??= {};
  character.proficiencies.armor ??= new Set();
  character.proficiencies.weapons ??= new Set();
  character.proficiencies.skills ??= new Set();

  character.pendingChoices ??= {};
  character.resolvedChoices ??= {};

  character.savingThrows ??= {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false
  };

  character.spellcasting ??= {
    enabled: false,
    ability: null,
    type: null,
    focus: [],
    ritual: false,

    // 🔑 SPELL DATA
    cantripsKnown: 0,
    cantrips: new Set(),

    available: new Set(),
    prepared: new Set(),
    alwaysPrepared: new Set(),

    slotsPerLevel: [],
    slots: {
      max: {},
      used: {}
    }
  };

  /* =========================
      CLASS CORE
   ========================= */
  character.class.id = classData.id;
  character.class.name = classData.name;
  character.class.level = level;
  
  /* =========================
    OSTRUMITE GUNNER – WEAPON PLATFORM INIT
  ========================= */
  if (classData.id === "ostrumite-gunner") {
    character.weapons ??= {};

    // Only create once
    if (!character.weapons.primary) {
      character.weapons.primary = {
        id: "ostrumite-gunblade-prototype",
        frame: "prototype",

        modCapacity: 2, // prototype limit
        installedMods: {
          core: null,
          barrel: null,
          blade: null,
          edge: null,
          stabilizer: null
        }
      };
    }
  }

  /* =========================
      HIT DIE
   ========================= */
  character.hp.hitDie = classData.hitDie;

  /* =========================
      SAVING THROWS
   ========================= */
  Object.keys(character.savingThrows).forEach(stat => {
    character.savingThrows[stat] = false;
  });

  classData.savingThrows.forEach(stat => {
    character.savingThrows[stat] = true;
  });

  /* =========================
      ARMOR & WEAPONS
   ========================= */
  classData.proficiencies?.armor?.forEach(p =>
    character.proficiencies.armor.add(p)
  );

  classData.proficiencies?.weapons?.forEach(p =>
    character.proficiencies.weapons.add(p)
  );

  /* =========================
    SKILL CHOICES (ONCE)
  ========================= */
  if (
    classData.skillChoices &&
    !character.pendingChoices.skills &&
    !character.resolvedChoices.skills
  ) {
    character.pendingChoices.skills = {
      choose: classData.skillChoices.choose,
      from: [...classData.skillChoices.from],
      source: classData.id
    };
  }

  /* =========================
      SPELLCASTING
   ========================= */
  if (classData.spellcasting) {
    character.spellcasting.enabled = true;
    character.spellcasting.ability = classData.spellcasting.ability;
    character.spellcasting.type = classData.spellcasting.type;
    character.spellcasting.focus = classData.spellcasting.focus ?? [];
    character.spellcasting.ritual = classData.spellcasting.ritual ?? false;
    } else {
      character.spellcasting.enabled = false;
    }


  /* =========================
     CANTRIPS KNOWN (UNIVERSAL)
  ========================= */
  if (character.spellcasting.enabled) {
    try {
      const res = await fetch(
        `./data/cantripsKnown/${character.class.id}.json`
      );

      if (res.ok) {
        const table = await res.json();
        character.spellcasting.cantripsKnown =
          table[String(level)] ?? 0;
      } else {
        character.spellcasting.cantripsKnown = 0;
      }
    } catch {
      character.spellcasting.cantripsKnown = 0;
    }

    character.spellcasting.cantrips ??= new Set();
  }

  /* =========================
     SPELL SLOTS (CLASS-DRIVEN)
  ========================= */
  if (character.spellcasting.enabled) {
    try {
      const res = await fetch(
        `./data/spellSlots/${character.class.id}.json`
      );
      if (res.ok) {
        const table = await res.json();
        character.spellcasting.slotsPerLevel =
          table[String(level)] ?? [];
      }
    } catch (e) {
      console.warn("No spell slots for class:", character.class.id);
      character.spellcasting.slotsPerLevel = [];
    }
  }
  /* =========================
  🛠️ ARTIFICER SPELL ACCESS
  (populate sc.available with ALL eligible prepared spells)
========================= */
if (classData.id === "artificer") {
  const sc = character.spellcasting;

  // Always reset the eligible pool on class apply
  sc.available = new Set();

  // Keep these if they already exist (selected cantrips / prepared today)
  sc.prepared ??= new Set();
  sc.cantrips ??= new Set();

  // Robust spell-level parsing (handles level, spellLevel, tags, etc.)
  const getSpellLevel = (spell) => {
    // Common fields
    if (spell.level !== undefined && spell.level !== null && spell.level !== "")
      return Number(spell.level);

    if (spell.spellLevel !== undefined && spell.spellLevel !== null && spell.spellLevel !== "")
      return Number(spell.spellLevel);

    // Tags fallback (very common)
    const tags = Array.isArray(spell.tags) ? spell.tags.map(String) : [];

    if (tags.some(t => t.toLowerCase().includes("cantrip"))) return 0;

    // Look for "1st-level", "2nd-level", etc.
    const lvlTag = tags.find(t => /(\d)(st|nd|rd|th)[ -]?level/i.test(t));
    if (lvlTag) {
      const m = lvlTag.match(/(\d)(st|nd|rd|th)[ -]?level/i);
      if (m) return Number(m[1]);
    }

    return NaN; // unknown
  };

  try {
    const res = await fetch("./data/spells/artificer.json");
    if (!res.ok) throw new Error(`artificer spells fetch failed (${res.status})`);

    const spells = await res.json();

    // ✅ Determine max spell level available (fallback if slots table is weird)
    const maxSpellLevelFromSlots =
      Array.isArray(sc.slotsPerLevel)
        ? (sc.slotsPerLevel.findLastIndex(slots => Number(slots) > 0) + 1)
        : 0;

    const maxSpellLevel = maxSpellLevelFromSlots > 0
      ? maxSpellLevelFromSlots
      : Math.ceil(level / 2); // artificer half-caster fallback

    spells.forEach(spell => {
      const id =
        spell.id ??
        spell.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      if (!id) return;

      const lvl = getSpellLevel(spell);
      if (!Number.isFinite(lvl)) return;

      // 🔥 IMPORTANT:
      // We only want the FULL prepared spell LIST here,
      // NOT the selected cantrips and NOT the prepared-today set.
      if (lvl >= 1 && lvl <= maxSpellLevel) {
        sc.available.add(id);
      }
    });

  } catch (e) {
    console.warn("Failed to load artificer spells", e);
  }
}

// =========================
// 🧙 Wizard: Spellbook Learning (CHOICE-BASED)
// =========================
if (classData.id === "wizard") {
  const sc = character.spellcasting;

  sc.available ??= new Set();
  sc.prepared ??= new Set();

  // First time wizard
  if (!sc._wizardInitialized) {
    sc.spellsToLearn = 6;
    sc._wizardInitialized = true;
  } else {
    sc.spellsToLearn += 2;
  }

  // 🔑 PENDING CHOICE
  if (sc.spellsToLearn > 0) {
    character.pendingChoices ??= {};
    character.pendingChoices.spells = {
      choose: sc.spellsToLearn
    };

    character.resolvedChoices ??= {};
    character.resolvedChoices.spells = false;
  }
} else {
  character.spellcasting.spellsToLearn = 0;
}
/* =========================
   BARD SPELLCASTING (KNOWN)
========================= */
if (classData.id === "bard") {
  character.spellcasting.enabled = true;
  character.spellcasting.type = "full";
  character.spellcasting.ability = "cha";

  character.spellcasting.available ??= new Set();
  character.spellcasting.prepared = null;

  // ✅ Load spells-known table (ONCE per level)
  try {
    const res = await fetch(`./data/spellsKnown/bard.json`);
    if (res.ok) {
      const table = await res.json();
      character.spellcasting.spellsKnown =
        table[String(level)] ?? 0;
    } else {
      character.spellcasting.spellsKnown = 0;
    }
  } catch {
    character.spellcasting.spellsKnown = 0;
  }
}// Base bard spells-known table already loaded above

// 📚 College of Lore: Additional Magical Secrets (+2 at level 6+)
if (
  character.class.id === "bard" &&
  character.subclass?.id === "lore" &&
  level >= 6
) {
  character.spellcasting.spellsKnown += 2;
}




  /* =========================
    FEATURES (LEVEL AWARE)
  ========================= */
  if (classData.levels && typeof classData.levels === "object") {
    Object.entries(classData.levels).forEach(([lvl, data]) => {
      if (Number(lvl) > level) return;
      if (!Array.isArray(data.features)) return;

      data.features.forEach(feature => {
        // 🚫 Skip subclass placeholders once a subclass exists
        if (feature.type === "subclass" && character.subclass) return;

        // =========================
        // CHOICE FEATURES (generic)
        // =========================
        if (
          feature.type === "choice" &&
          !character.features.some(f => f.parentFeature === feature.id)
        ) {
          // 🚫 Skip Artificer Infuse Item (handled elsewhere)
          if (
            character.class.id === "artificer" &&
            feature.id === "infuse-item"
          ) {
            return;
          }

          character.pendingChoices.choiceFeature = {
            feature,
            source: classData.id
          };
          return;
        }

        // =========================
        // ADD FEATURE ONCE
        // =========================
        if (!character.features.some(f => f.id === feature.id)) {
          character.features.push({
            ...feature,
            source: classData.id,
            level: Number(lvl)
          });

          // =========================
          // 🎵 BARD MAGICAL SECRETS
          // (class feature only)
          // =========================
          if (
            classData.id === "bard" &&
            feature.id.startsWith("magical-secrets") &&
            !character.resolvedChoices?.[feature.id]
          ) {
            character.pendingChoices.spells = {
              choose: feature.choose ?? 2,
              from: "any",
              source: feature.id
            };
          }
        }
      });
    });
  }


  /* =========================
    INFUSION LEARN (LEVEL 2)
  ========================= */
  if (
    character.class.id === "artificer" &&
    level >= 2 &&
    !character.resolvedChoices.infusions &&
    !character.pendingChoices.infusions
  ) {
    character.pendingChoices.infusions = {
      choose: 4,
      source: "artificer"
    };
  }

/* =========================
   SUBCLASS UNLOCK (LEVEL-BASED)
========================= */
Object.entries(classData.levels || {}).forEach(([lvl, data]) => {
  if (Number(lvl) > character.level) return;
  if (!data.subclass) return;
  if (character.subclass) return;

  character.pendingSubclassChoice ??= {
    classId: classData.id,
    label: data.subclass.label,
    source: data.subclass.optionsSource
  };
});


  /* =========================
     CLAMP PREPARED SPELLS
  ========================= */
  if (character.spellcasting?.prepared) {
    const limit = Math.max(
      1,
      Math.floor((character.abilities.int - 10) / 2) +
        Math.floor(level / 2)
    );

    const prepared = [...character.spellcasting.prepared];
    if (prepared.length > limit) {
      character.spellcasting.prepared = new Set(
        prepared.slice(0, limit)
      );
    }
  }

  /* =========================
     LEVEL-BASED CHOICES
  ========================= */
  const levelData = classData.levels[level];

  if (levelData?.choices) {
    Object.entries(levelData.choices).forEach(([key, cfg]) => {
      if (!character.resolvedChoices[key]) {
        character.pendingChoices[key] = cfg;
      }
    });
  }

  console.log("applyClass complete:", character);
}
