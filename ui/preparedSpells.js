import { character } from "../data/character.js";
import {
  artificerPrepLimit,
  wizardPrepLimit,
  spellIdFromTitle,
  spellLevelFromTags,
  isCantripFromTags
} from "../engine/rules/spellPrepRules.js";

export async function renderPreparedSpells() {
  const container = document.getElementById("preparedSpells");
  if (!container) return;

  container.innerHTML = "";

  if (!character.spellcasting?.enabled || !character.class?.id) {
    container.textContent = "—";
    return;
  }

  character.spellcasting.prepared ??= new Set();
  character.spellcasting.alwaysPrepared ??= new Set();

  const prepared = character.spellcasting.prepared;
  const alwaysPrepared = character.spellcasting.alwaysPrepared;

  const limit =
    character.class.id === "wizard"
      ? wizardPrepLimit(character)
      : artificerPrepLimit(character);

  // 🔑 Max spell level comes from slots, NOT class math
  const maxLevel =
    character.spellcasting?.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;


  // 🔑 Load class spell list (same source as spellList.js)
  const res = await fetch(`./data/spells/${character.class.id}.json`);
  const spells = await res.json();

  // Header
  const header = document.createElement("p");
  header.innerHTML = `<strong>${prepared.size} / ${limit}</strong> prepared`;
  container.appendChild(header);

  spells.forEach(spell => {
    const id = spellIdFromTitle(spell.title);

    // Skip cantrips
    if (isCantripFromTags(spell.tags)) return;

    const level = spellLevelFromTags(spell.tags);
    if (!level || level > maxLevel) return;

    // Always-prepared spells are locked
    if (alwaysPrepared.has(id)) return;

    const label = document.createElement("label");
    label.style.display = "block";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = prepared.has(id);
    if (!cb.checked && prepared.size >= limit) {
      cb.disabled = true;
    }

    cb.onchange = () => {
      if (cb.checked) {
        if (prepared.size >= limit) {
          cb.checked = false;
          return;
        }
        prepared.add(id);
      } else {
        prepared.delete(id);
      }

      renderPreparedSpells();
      // 🔑 update highlighting
      window.dispatchEvent(new Event("prepared-spells-updated"));
    };

    label.appendChild(cb);
    label.append(` ${spell.title}`);
    container.appendChild(label);
  });
}
