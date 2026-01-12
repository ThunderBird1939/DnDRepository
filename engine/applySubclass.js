function resetArmorerModeState(character) {
  if (!character.combat) return;

  delete character.combat.thunderGauntletsActive;
  delete character.combat.lightningLauncherUsed;
}

export function applySubclass(character, subclassData) {
  if (!subclassData) return;
  character._subclassData = subclassData;
  /* =========================
     SUBCLASS CORE
  ========================= */
  character.subclass = {
    id: subclassData.id,
    name: subclassData.name,
    classId: subclassData.classId
  };

  character.features ??= [];
  character.proficiencies ??= {};
  character.proficiencies.skills ??= new Set();
  character.proficiencies.tools ??= new Set();
  
  /* =========================
     RESET SUBCLASS SPELL STATE
  ========================= */
  if (character.spellcasting) {
    character.spellcasting.alwaysPrepared = new Set();
  }

  /* =========================
     RESET SUBCLASS COMBAT FLAGS
  ========================= */
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
    resetArmorerModeState(character);

    character.combat.arcaneArmor = true;
    character.combat.armorerMode ??= "guardian";

    character.equipment ??= {};
    if (!character.equipment.armor) {
      character.equipment.armor = "plate";
    }
    character.equipment.shield = false;
  }

  /* =========================
     FEATURES (LEVEL AWARE)
  ========================= */
  Object.entries(subclassData.featuresByLevel || {}).forEach(
    ([lvl, features]) => {
      if (Number(lvl) > character.class.level) return;
      if (!Array.isArray(features)) return;

      features.forEach(feature => {
        if (!character.features.some(f => f.id === feature.id)) {
          character.features.push({
            ...feature,
            source: subclassData.id,
            level: Number(lvl)
          });
        }

        // Skills
        if (Array.isArray(feature.skills)) {
          feature.skills.forEach(skill =>
            character.proficiencies.skills.add(skill)
          );
        }

        // Tools
        if (Array.isArray(feature.tools)) {
          feature.tools.forEach(tool => {
            if (!character.proficiencies.tools.has(tool)) {
              character.proficiencies.tools.add(tool);
            } else {
              character.pendingChoices ??= {};
              character.pendingChoices.tools = { choose: 1 };
            }
          });
        }

        // Spell tables → always prepared
        if (feature.type === "spell-table" && feature.spells) {
          character.spellcasting ??= {};
          character.spellcasting.alwaysPrepared ??= new Set();

          Object.entries(feature.spells).forEach(
            ([spellLevel, spells]) => {
              if (Number(spellLevel) > character.class.level) return;
              spells.forEach(spellId =>
                character.spellcasting.alwaysPrepared.add(spellId)
              );
            }
          );
        }
      });
    }
  );

  /* =========================
     CLEAR PENDING CHOICE
  ========================= */
  character.pendingSubclassChoice = null;
  character.resolvedChoices ??= {};
  character.resolvedChoices.subclass = true;

  // 🔔 Notify UI
  window.dispatchEvent(new Event("combat-updated"));
  window.dispatchEvent(new Event("features-updated"));

  console.log("Subclass applied:", character.subclass);
}
