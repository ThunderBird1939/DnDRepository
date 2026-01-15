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
  if (!character.resolvedChoices?.subclass) {
    character.spellcasting.alwaysPrepared = new Set();
  }


  /* =========================
     RESET SUBCLASS COMBAT FLAGS
  ========================= */
  // DO NOT recreate combat object
  delete character.combat?.arcaneArmor;
  delete character.combat?.arcaneArmorLocked;


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
   ARTILLERIST: ELDRITCH CANNON
========================= */
if (
  subclassData.id === "artillerist" &&
  character.class?.id === "artificer"
) {
  character.combat ??= {};

  // Default cannon selection
  character.combat.eldritchCannonType ??= "force-ballista";
}

/* =========================
   BATTLE SMITH: STEEL DEFENDER
========================= */
if (
  subclassData.id === "battle-smith" &&
  character.class?.id === "artificer"
) {
  character.combat ??= {};

  character.combat.steelDefender = {
    active: true,
    mode: "defender" // future-proof (defender / aggressive / support)
  };
}
/* =========================
   BATTLE SMITH: ARCANE JOLT
========================= */
if (
  subclassData.id === "battle-smith" &&
  character.class?.id === "artificer" &&
  character.level >= 9
) {
  character.combat ??= {};

  character.combat.arcaneJolt = {
    usesMax: Math.max(1, Math.floor((character.abilities.int - 10) / 2)),
    description:
      "When you hit with a magic weapon or your Steel Defender hits, you can deal extra force damage or restore hit points."
  };
}
/* =========================
   ARCANE ARCHER: ARCANE SHOT CORE
========================= */
if (
  subclassData.id === "arcane-archer" &&
  character.class?.id === "fighter"
) {
  character.combat ??= {};
  character.pendingChoices ??= {};
  character.resolvedChoices ??= {};

  // Preserve existing known shots if re-applying
  const existingKnown =
    character.combat.arcaneShot?.knownShots ?? new Set();

  // ✅ Initialize Arcane Shot FIRST
  character.combat.arcaneShot = {
    usesMax: 2,
    usesUsed: character.combat.arcaneShot?.usesUsed ?? 0,
    knownShots: existingKnown,
    selectedShot: null
  };

  // ✅ THEN decide if the choice modal is needed
  if (
    character.level >= 3 &&
    !character.resolvedChoices.arcaneShots &&
    character.combat.arcaneShot.knownShots.size === 0 &&
    !character.pendingChoices.arcaneShots
  ) {
    character.pendingChoices.arcaneShots = { choose: 2 };
  }
}
/* =========================
   PHANTOM – SOUL TRINKETS
========================= */
if (
  subclassData.id === "phantom" &&
  character.class.id === "rogue" &&
  character.class.level >= 9
) {
  character.combat ??= {};

  character.combat.soulTrinkets ??= {
    current: 0,
    max: character.proficiencyBonus
  };

  // Always sync max to proficiency bonus
  character.combat.soulTrinkets.max = character.proficiencyBonus;

  // Clamp current
  if (character.combat.soulTrinkets.current > character.combat.soulTrinkets.max) {
    character.combat.soulTrinkets.current = character.combat.soulTrinkets.max;
  }
}

/* =========================
   COLLEGE OF LORE: BONUS SKILLS
========================= */
if (
  subclassData.id === "lore" &&
  character.class?.id === "bard" &&
  character.level >= 3 &&
  !character.resolvedChoices?.loreBonusSkills
) {
  character.pendingChoices.skills = {
    choose: 3,
    from: "any",
    source: "lore"
  };
}



  /* =========================
     FEATURES (LEVEL AWARE)
  ========================= */
  Object.entries(subclassData.featuresByLevel || {}).forEach(
    ([lvl, features]) => {
      if (Number(lvl) > character.level) return;
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
        // Spell tables → always prepared
        if (feature.type === "spell-table" && feature.spells) {
          character.spellcasting ??= {};
          character.spellcasting.alwaysPrepared ??= new Set();

          Object.entries(feature.spells).forEach(
            ([spellLevel, spells]) => {
              if (Number(spellLevel) > character.level) return;
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
