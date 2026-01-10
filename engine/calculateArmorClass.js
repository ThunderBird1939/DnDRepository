import { loadArmor } from "../ui/armorLoader.js";

/**
 * Calculates final Armor Class for a character
 */
export async function calculateArmorClass(character) {
  const armorData = await loadArmor();

  const dexMod = Math.floor(
    ((character.abilities?.dex ?? 10) - 10) / 2
  );

  let ac = 10;

  const armorId = character.equipment?.armor;
  const hasShield = character.equipment?.shield;

  const armor = armorId
    ? armorData.find(a => a.id === armorId)
    : null;

character.combat ??= {};

// 🔁 Always reset penalties to avoid stale UI state
character.combat.armorPenalty = false;
character.combat.strPenalty = false;

  /* =========================
     ARMOR
  ========================= */
if (armor) {
  ac = armor.baseAC;

  const profs = [...(character.proficiencies?.armor || [])];
  character.combat.armorPenalty = false;
  character.combat.strPenalty = false; // 👈 NEW

 const isArcaneArmor = !!character.combat?.arcaneArmor;

// ❌ Not proficient (ignored by Arcane Armor)
if (
  !isArcaneArmor &&
  armor.category !== "shield" &&
  !profs.includes(armor.category)
) {
  character.combat.armorPenalty = true;
}

// 💪 Strength requirement (ignored by Arcane Armor)
if (
  !isArcaneArmor &&
  armor.category === "heavy" &&
  armor.strengthRequirement &&
  (character.abilities?.str ?? 10) < armor.strengthRequirement
) {
  character.combat.strPenalty = true;
}


  // Dex handling
  if (armor.category === "heavy") {
    // no Dex bonus
  } else if (armor.dexBonus === "full") {
    ac += dexMod;
  } else if (armor.dexBonus === "max2") {
    ac += Math.min(2, dexMod);
  }
}

  /* =========================
     SHIELD
  ========================= */
  if (hasShield) {
    const shield = armorData.find(a => a.category === "shield");
    if (shield) ac += shield.acBonus;
  }

  /* =========================
     MODIFIERS
  ========================= */
  (character.acModifiers || []).forEach(mod => {
    ac += mod;
  });

  return ac;
}
