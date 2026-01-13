import { character } from "../data/character.js";
import {
  maxArtificerSpellLevel,
  spellLevelFromTags,
  isCantripFromTags,
  spellIdFromTitle,
  artificerPrepLimit
} from "../engine/rules/spellPrepRules.js";
import { openSpellDetail } from "./spellDetailModal.js";

/**
 * Render Available Spells
 * - Click: prepare / unprepare
 * - Right-click: open spell detail
 * - Enforces prep limits
 */
export async function renderSpellList() {
  const container = document.getElementById("spellList");
  if (!container) return;

  container.innerHTML = "";

  if (!character.spellcasting?.enabled || !character.class?.id) {
    container.textContent = "—";
    return;
  }

  // ✅ Ensure state
  character.spellcasting.prepared ??= new Set();
  character.spellcasting.alwaysPrepared ??= new Set();

  const prepared = character.spellcasting.prepared;
  const alwaysPrepared = character.spellcasting.alwaysPrepared;

  const prepLimit = artificerPrepLimit(character);
  const maxSpellLevel = maxArtificerSpellLevel(character.level);

  // 🔑 Load class spell list
  const res = await fetch(`./data/spells/${character.class.id}.json`);
  if (!res.ok) {
    container.textContent = "Spell data missing.";
    return;
  }

  const spells = await res.json();
  if (!Array.isArray(spells)) {
    container.textContent = "Invalid spell data.";
    return;
  }

  /* =========================
     Group spells by level
  ========================= */
  const byLevel = {};

  spells.forEach(spell => {
    const id = spellIdFromTitle(spell.title);

    let level;
    if (isCantripFromTags(spell.tags)) {
      level = 0;
    } else {
      level = spellLevelFromTags(spell.tags);
      if (level === null || level > maxSpellLevel) return;
    }

    byLevel[level] ??= [];
    byLevel[level].push({ spell, id });
  });

  const levels = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => a - b);

  if (!levels.length) {
    container.textContent = "No spells available.";
    return;
  }

  /* =========================
     Render
  ========================= */
  levels.forEach(level => {
    const details = document.createElement("details");
    if (level === 0) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent =
      level === 0 ? "Cantrips" : `Level ${level} Spells`;

    details.appendChild(summary);

    const ul = document.createElement("ul");

    byLevel[level]
      .sort((a, b) => a.spell.title.localeCompare(b.spell.title))
      .forEach(({ spell, id }) => {
        const li = document.createElement("li");
        li.textContent = spell.title;
        li.style.cursor = "pointer";

        if (alwaysPrepared.has(id)) {
          li.textContent += " (always prepared)";
          li.classList.add("prepared");
        } else if (prepared.has(id)) {
          li.classList.add("prepared");
        }

        // ✅ Left-click: prepare / unprepare
        li.onclick = e => {
          e.preventDefault();
          e.stopPropagation();

          if (alwaysPrepared.has(id)) return;

          if (prepared.has(id)) {
            prepared.delete(id);
          } else {
            if (prepared.size >= prepLimit) {
              alert(`You can only prepare ${prepLimit} spells.`);
              return;
            }
            prepared.add(id);
          }

          window.dispatchEvent(new Event("spells-updated"));
        };

        // 🔍 Right-click: spell detail
        li.oncontextmenu = e => {
          e.preventDefault();
          openSpellDetail(spell);
        };

        ul.appendChild(li);
      });

    details.appendChild(ul);
    container.appendChild(details);
  });
}
