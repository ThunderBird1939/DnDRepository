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
  character.combat.armorPenalty = false;

  /* =========================
     ARMOR
  ========================= */
  if (armor) {
    ac = armor.baseAC;

    const profs = character.proficiencies?.armor || [];

    if (
      (armor.category !== "shield" && !profs.includes(armor.category)) ||
      (armor.category === "shield" && !profs.includes("shield"))
    ) {
      character.combat.armorPenalty = true;
    }

    // Heavy armor: no Dex bonus
    if (armor.category === "heavy") {
      // Dex explicitly ignored
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
