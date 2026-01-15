import { character } from "../data/character.js";
import { renderManifestTechniques } from "./manifestTechniques.js";

const DESCRIPTIONS = {
  "obligated-guardian": "You act because you must. Control, protection, retaliation.",
  "reluctant-partner": "You fight beside your companion, controlling space and movement.",
  "engaged-companion": "You move together, chaining attacks through momentum.",
  "steadfast-sentinel": "You hold the line and protect those behind you."
};

export function initDispositionUI() {
  const panel = document.getElementById("dispositionPanel");
  const select = document.getElementById("dispositionSelect");
  const desc = document.getElementById("dispositionDescription");

  if (!panel || !select || !desc) return;

  // Only for Bound Vanguard AND level 3+
  if (character.class?.id !== "bound-vanguard" || character.level < 3) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  select.value = character.disposition ?? "";
  desc.textContent = DESCRIPTIONS[character.disposition] ?? "";

  select.onchange = () => {
    if (character.dispositionLocked) return;

    character.disposition = select.value || null;
    desc.textContent = DESCRIPTIONS[character.disposition] ?? "";

    renderManifestTechniques();
  };
}
