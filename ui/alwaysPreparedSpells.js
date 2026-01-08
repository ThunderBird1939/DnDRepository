import { character } from "../data/character.js";
import { getSpellById, loadSpellsForClass } from "../engine/lookups/spellLookup.js";
import { openSpellDetail } from "./spellDetailModal.js";

export async function renderAlwaysPreparedSpells() {
  const container = document.getElementById("alwaysPreparedSpells");
  if (!container) return;

  container.innerHTML = "";

  const alwaysPrepared = character.spellcasting?.alwaysPrepared;
  if (!alwaysPrepared || alwaysPrepared.size === 0) {
    container.textContent = "—";
    return;
  }

  // 🔑 THIS IS THE MISSING PIECE
  await loadSpellsForClass(character.class.id);

  const ul = document.createElement("ul");

  [...alwaysPrepared]
    .map(id => getSpellById(id))
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach(spell => {
      const li = document.createElement("li");
      li.textContent = spell.title;
      li.style.cursor = "pointer";

      li.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        openSpellDetail(spell);
      };

      ul.appendChild(li);
    });

  container.appendChild(ul);
}
