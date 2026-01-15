import { character } from "../data/character.js";
import { getSpellById } from "../engine/lookups/spellLookup.js";
import { openSpellDetail } from "./spellDetailModal.js";

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
export async function renderSpellcasting() {
  const summary = document.getElementById("spellcastingSummary");
  const slotsDiv = document.getElementById("spellSlots");
  const alwaysDiv = document.getElementById("alwaysPreparedSpells");

  if (!summary || !slotsDiv || !alwaysDiv) return;

  summary.innerHTML = "";
  slotsDiv.innerHTML = "";
  alwaysDiv.innerHTML = "";

  if (!character.spellcasting?.enabled) {
    summary.textContent = "—";
    return;
  }

  // ===== Summary =====
  summary.innerHTML = `
    <div>
      <strong>Ability:</strong> ${cap(character.spellcasting.ability)}<br/>
      <strong>Casting Type:</strong> ${cap(character.spellcasting.type)}
    </div>
  `;

  // ===== Spell Slots (display only) =====
    const row = character.spellcasting.slotsPerLevel;
    if (row && row.length) {
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    const header = document.createElement("tr");

    // Character level column
    const thLvl = document.createElement("th");
    thLvl.textContent = "Lvl";
    thLvl.style.padding = "0.25rem 0.5rem";
    header.appendChild(thLvl);

    // Spell level headers (1 → N)
    row.forEach((_, i) => {
      const th = document.createElement("th");
      th.textContent = i + 1;
      th.style.padding = "0.25rem 0.5rem";
      header.appendChild(th);
    });

    table.appendChild(header);

    const tr = document.createElement("tr");

    const lvl = document.createElement("td");
    lvl.textContent = character.level;
    lvl.style.padding = "0.25rem 0.5rem";
    tr.appendChild(lvl);

    row.forEach(n => {
      const td = document.createElement("td");
      td.textContent = n || "—";
      td.style.padding = "0.25rem 0.5rem";
      tr.appendChild(td);
    });

    table.appendChild(tr);
    slotsDiv.appendChild(table);
  }

  // ===== Always Prepared Spells (subclass) =====
const always = [...(character.spellcasting.alwaysPrepared ?? [])];

if (always.length === 0) {
  alwaysDiv.textContent = "—";
} else {
  always.sort().forEach(spellId => {
    const row = document.createElement("div");
    row.className = "spell-row always";
    row.textContent = spellId.replace(/-/g, " ");

row.onclick = e => {
  e.preventDefault();
  e.stopPropagation();

  const spell = getSpellById(spellId);
  if (!spell) {
    console.warn("Spell not found:", spellId);
    return;
  }
  openSpellDetail(spell);
};
alwaysDiv.appendChild(row);

  });
}
}
