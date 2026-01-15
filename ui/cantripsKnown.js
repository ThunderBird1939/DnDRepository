import { character } from "../data/character.js";
import { openSpellDetail } from "./spellDetailModal.js";
import {
  isCantripFromTags,
  spellIdFromTitle
} from "../engine/rules/spellPrepRules.js";

export async function renderCantripsKnown() {
  const container = document.getElementById("cantripsKnownList");
  if (!container) return;

  container.innerHTML = "";

  const sc = character.spellcasting;
  if (!sc?.enabled || !sc.cantripsKnown) {
    container.textContent = "—";
    return;
  }

  sc.cantrips ??= new Set();
  const chosen = sc.cantrips;
  const limit = sc.cantripsKnown;

  const res = await fetch(`./data/spells/${character.class.id}.json`);
  const spells = await res.json();

  const cantrips = spells.filter(s => isCantripFromTags(s.tags));

  if (!cantrips.length) {
    container.textContent = "No cantrips available.";
    return;
  }

  const header = document.createElement("p");
  header.innerHTML = `<strong>${chosen.size} / ${limit}</strong> selected`;
  container.appendChild(header);

  cantrips
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach(spell => {
      const id = spellIdFromTitle(spell.title);
      const label = document.createElement("label");
      label.style.display = "block";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = chosen.has(id);

      if (!cb.checked && chosen.size >= limit) cb.disabled = true;

      cb.onchange = () => {
        cb.checked ? chosen.add(id) : chosen.delete(id);
        renderCantripsKnown();
        window.dispatchEvent(new Event("cantrips-updated"));
      };

      const name = document.createElement("span");
      name.textContent = spell.title;
      name.style.cursor = "pointer";
      name.style.marginLeft = "0.25rem";
      name.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        openSpellDetail(spell);
      };

      label.append(cb, name);
      container.appendChild(label);
    });
}
