import { character } from "../data/character.js";

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

export function updateManifestEnergy() {
  const panel = document.getElementById("manifestEnergyPanel");
  if (!panel) return;

  // Only show for Bound Vanguard
  if (character.class?.id !== "bound-vanguard") {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  // Determine manifest ability (CHA default, WIS optional later)
  const manifestAbility =
    character.class?.manifestAbility?.chosen ??
    character.class?.manifestAbility?.default ??
    "cha";

  const mod = abilityMod(character.abilities?.[manifestAbility] ?? 10);
  const level = character.level || 1;

  const max = Math.max(1, level + mod);

  character.combat.manifestEnergy ??= { current: max, max };
  character.combat.manifestEnergy.max = max;

  if (character.combat.manifestEnergy.current > max) {
    character.combat.manifestEnergy.current = max;
  }

  document.getElementById("manifestCurrent").textContent =
    character.combat.manifestEnergy.current;
  document.getElementById("manifestMax").textContent = max;
}

export function bindManifestEnergyControls() {
  const minus = document.getElementById("manifestMinus");
  const plus = document.getElementById("manifestPlus");

  if (!minus || !plus) return;

  minus.onclick = () => {
    const me = character.combat.manifestEnergy;
    if (me.current > 0) {
      me.current--;
      updateManifestEnergy();
    }
  };

  plus.onclick = () => {
    const me = character.combat.manifestEnergy;
    if (me.current < me.max) {
      me.current++;
      updateManifestEnergy();
    }
  };
}
