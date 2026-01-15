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
  if (character.class.id === "bard") {
    container.textContent = "Bards do not prepare spells.";
    return;
  }

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

  // 🔒 Clamp prepared count
  if (prepared.size > limit) {
    character.spellcasting.prepared = new Set(
      [...prepared].slice(0, limit)
    );
  }

  // 🔑 Max spell level comes from slots
  const maxLevel =
    character.spellcasting?.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  const res = await fetch(`./data/spells/${character.class.id}.json`);
  const spells = await res.json();

  // 🔑 Wizard: only spells in spellbook
  let sourceSpells = spells;
  if (character.class.id === "wizard") {
    const book = character.spellcasting.available ?? new Set();
    sourceSpells = spells.filter(spell =>
      book.has(spellIdFromTitle(spell.title))
    );
  }

  // Header
  const header = document.createElement("p");
  header.innerHTML = `<strong>${prepared.size} / ${limit}</strong> prepared`;
  container.appendChild(header);

  sourceSpells.forEach(spell => {
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
      window.dispatchEvent(new Event("prepared-spells-updated"));
    };

    label.appendChild(cb);
    label.append(` ${spell.title}`);
    container.appendChild(label);
  });
}
