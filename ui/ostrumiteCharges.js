import { character } from "../data/character.js";

function proficiencyBonus(level) {
  return Math.ceil(1 + level / 4);
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

export function updateOstrumiteCharges() {
  const panel = document.getElementById("ostrumiteChargesPanel");
  if (!panel) return;

  // Only for Gunner
  if (character.class?.id !== "ostrumite-gunner") {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  const intMod = abilityMod(character.abilities.int || 10);
  const prof = proficiencyBonus(character.level || 1);

  const max = Math.max(1, prof + intMod);

  character.combat.ostrumiteCharges ??= { current: max, max };
  character.combat.ostrumiteCharges.max = max;

  if (character.combat.ostrumiteCharges.current > max) {
    character.combat.ostrumiteCharges.current = max;
  }

  document.getElementById("ostrumiteCurrent").textContent =
    character.combat.ostrumiteCharges.current;
  document.getElementById("ostrumiteMax").textContent = max;
}

export function bindOstrumiteChargeControls() {
  const minus = document.getElementById("ostrumiteMinus");
  const plus = document.getElementById("ostrumitePlus");

  if (!minus || !plus) return;

  minus.onclick = () => {
    const charges = character.combat.ostrumiteCharges;
    if (charges.current > 0) {
      charges.current--;
      updateOstrumiteCharges();
    }
  };

  plus.onclick = () => {
    const charges = character.combat.ostrumiteCharges;
    if (charges.current < charges.max) {
      charges.current++;
      updateOstrumiteCharges();
    }
  };
}
