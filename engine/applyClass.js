export function applyClass(character, classData, level = 1) {
  if (!classData) return;

  /* =========================
     ENSURE STRUCTURE
  ========================= */
  character.class ??= {};
  character.features ??= [];

  character.proficiencies ??= {};
  character.proficiencies.armor = new Set();
  character.proficiencies.weapons ??= new Set();
  character.proficiencies.tools ??= new Set();
  character.proficiencies.skills ??= new Set();

  character.pendingChoices ??= {}; // ✅ keep this
  character.savingThrows ??= {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false
  };

  /* =========================
     CLASS CORE
  ========================= */
  character.class.id = classData.id;
  character.class.name = classData.name;
  character.class.level = level;

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
     TOOL CHOICES (FINAL FIX)
  ========================= */
classData.proficiencies?.tools?.forEach(tool => {
  if (tool === "artisan-choice") {
    if (!character.resolvedChoices.tools) {
      character.pendingChoices.tools = {
        choose: 1,
        source: "artisan"
      };
    }
  } else {
    character.proficiencies.tools.add(tool);
  }
});

  /* =========================
     SKILL CHOICES (SAFE)
  ========================= */
  if (
    classData.skillChoices &&
    !character.pendingChoices.skills &&
    character.proficiencies.skills.size === 0
  ) {
    character.pendingChoices.skills = {
      choose: classData.skillChoices.choose,
      from: [...classData.skillChoices.from]
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
     FEATURES (LEVEL AWARE)
  ========================= */
  if (classData.levels && typeof classData.levels === "object") {
    Object.entries(classData.levels).forEach(([lvl, data]) => {
      if (Number(lvl) > level) return;
      if (!Array.isArray(data.features)) return;

      data.features.forEach(feature => {
        if (!character.features.some(f => f.id === feature.id)) {
          character.features.push({
            ...feature,
            source: classData.id,
            level: Number(lvl)
          });
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
    choose: 4, // Artificer learns 4 at level 2
    source: "artificer"
  };
}

  /* =========================
     SUBCLASS UNLOCK (LEVEL 3 ONCE)
  ========================= */
  if (
    level >= 3 &&
    classData.levels?.["3"]?.subclass &&
    !character.subclass &&
    !character.pendingSubclassChoice
  ) {
    character.pendingSubclassChoice = {
      classId: classData.id,
      label: classData.levels["3"].subclass.label,
      source: classData.levels["3"].subclass.optionsSource
    };
  }
  // 🔒 Clamp prepared spells if prep limit changed
if (character.spellcasting?.prepared) {
  const limit = Math.max(
    1,
    Math.floor((character.abilities.int - 10) / 2) +
    Math.floor(level / 2)
  );

  const prepared = [...character.spellcasting.prepared];
  if (prepared.length > limit) {
    character.spellcasting.prepared = new Set(prepared.slice(0, limit));
  }
}
// 🔧 Normalize level-based choices into pendingChoices
character.pendingChoices ??= {};
character.resolvedChoices ??= {};

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

