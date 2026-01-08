import armorData from "../data/armor.json";

/**
 * Calculates final Armor Class for a character
 */
export function calculateArmorClass(character) {
  const dexMod = Math.floor(
    ((character.abilities?.dex ?? 10) - 10) / 2
  );

  let ac = 10;

  const armorId = character.equipment?.armor;
  const hasShield = character.equipment?.shield;

  const armor = armorId
    ? armorData.find(a => a.id === armorId)
    : null;

  /* =========================
     ARMOR
  ========================= */
  if (armor) {
    ac = armor.baseAC;

    if (armor.dexBonus === "full") {
      ac += dexMod;
    } else if (armor.dexBonus === "max2") {
      ac += Math.min(2, dexMod);
    }
    // "none" → no Dex
  } else {
    // Unarmored
    ac = 10 + dexMod;
  }

  /* =========================
     SHIELD
  ========================= */
  if (hasShield) {
    const shield = armorData.find(a => a.category === "shield");
    if (shield) {
      ac += shield.acBonus;
    }
  }

  /* =========================
     MODIFIERS (future-proof)
  ========================= */
  (character.acModifiers || []).forEach(mod => {
    ac += mod;
  });

  return ac;
}
