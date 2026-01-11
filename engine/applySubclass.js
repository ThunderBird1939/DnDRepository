export function applySubclass(character, subclassData) {
  if (!subclassData) return;
function resetArmorerModeState(character) {
  if (!character.combat) return;

  delete character.combat.thunderGauntletsActive;
  delete character.combat.lightningLauncherUsed;
}

  /* =========================
     SUBCLASS CORE
  ========================= */
  character.subclass = {
    id: subclassData.id,
    name: subclassData.name,
    classId: subclassData.classId
  };

  /* =========================
     FEATURES (LEVEL AWARE)
  ========================= */
  Object.entries(subclassData.featuresByLevel || {}).forEach(
    ([lvl, features]) => {
      if (Number(lvl) > character.class.level) return;
      if (!Array.isArray(features)) return;

      features.forEach(feature => {
        /* =========================
           ADD FEATURE ONCE
        ========================= */
        if (!character.features.some(f => f.id === feature.id)) {
          character.features.push({
            ...feature,
            source: subclassData.id,
            level: Number(lvl)
          });
        }

        /* =========================
           ENSURE PROFICIENCY SETS
        ========================= */
        character.proficiencies ??= {};
        character.proficiencies.skills ??= new Set();
        character.proficiencies.tools ??= new Set();

        /* =========================
           SUBCLASS SKILL PROFICIENCIES
        ========================= */
        if (Array.isArray(feature.skills)) {
          feature.skills.forEach(skill => {
            character.proficiencies.skills.add(skill);
          });
        }

        /* =========================
           SUBCLASS TOOL PROFICIENCIES
        ========================= */
        if (Array.isArray(feature.tools)) {
          feature.tools.forEach(tool => {
            if (!character.proficiencies.tools.has(tool)) {
              character.proficiencies.tools.add(tool);
            } else {
              // 🔮 If already proficient, prompt later (future-proof)
              character.pendingChoices ??= {};
              character.pendingChoices.tools = { choose: 1 };
            }
          });
        }

        /* =========================
           SUBCLASS SPELL TABLES
           → Always Prepared
        ========================= */
        if (feature.type === "spell-table" && feature.spells) {
          character.spellcasting ??= {};
          character.spellcasting.alwaysPrepared ??= new Set();

          Object.entries(feature.spells).forEach(([spellLevel, spells]) => {
            if (Number(spellLevel) > character.class.level) return;
            if (!Array.isArray(spells)) return;

            spells.forEach(spellId => {
              character.spellcasting.alwaysPrepared.add(spellId);
            });
          });
        }
      });
    }
  );
// Reset subclass-specific combat flags
character.combat ??= {};
delete character.combat.arcaneArmor;
delete character.combat.arcaneArmorLocked;

/* =========================
   ARMORER: ARCANE ARMOR
========================= */
if (
  subclassData.id === "armorer" &&
  character.class?.id === "artificer"
) {
  character.combat ??= {};

  // 🔁 Reset mode-specific state
  resetArmorerModeState(character);

  character.combat.arcaneArmor = true;

  // Default mode (you can change later)
  character.combat.armorerMode ??= "guardian";

  // Auto-equip armor
  character.equipment ??= {};
  if (!character.equipment.armor) {
    character.equipment.armor = "plate";
  }

  character.equipment.shield = false;
}



  /* =========================
     CLEAR PENDING CHOICE
  ========================= */
  character.pendingSubclassChoice = null;

  if (character.resolvedChoices) {
    character.resolvedChoices.subclass = true;
  }

  console.log(
    "Subclass applied:",
    character.subclass,
    "Always prepared:",
    [...(character.spellcasting?.alwaysPrepared ?? [])],
    "Tools:",
    [...(character.proficiencies?.tools ?? [])],
    "Skills:",
    [...(character.proficiencies?.skills ?? [])]
  );

  // 🔔 Notify UI
  window.dispatchEvent(new Event("features-updated"));
}
