import { character } from "../data/character.js";
import {
  spellLevelFromTags,
  isCantripFromTags,
  spellIdFromTitle
} from "../engine/rules/spellPrepRules.js";
import { openSpellDetail } from "./spellDetailModal.js";

/**
 * Render Available Spells (READ-ONLY)
 * - Click: open spell detail modal
 * - Visually marks prepared & always-prepared spells
 * - Does NOT modify prepared spell state
 */
export async function renderSpellList() {
  const container = document.getElementById("spellList");
  if (!container) return;

  container.innerHTML = "";

  if (!character.spellcasting?.enabled || !character.class?.id) {
    container.textContent = "—";
    return;
  }

  // Ensure state exists (read-only use)
  character.spellcasting.prepared ??= new Set();
  character.spellcasting.alwaysPrepared ??= new Set();

  const prepared = character.spellcasting.prepared;
  const alwaysPrepared = character.spellcasting.alwaysPrepared;

  const maxSpellLevel =
  character.spellcasting?.slotsPerLevel
    ?.map((n, i) => (n > 0 ? i + 1 : null))
    .filter(Boolean)
    .pop() ?? 0;

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

      // 🔑 hard cap by slots
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

        // Visual state only
        if (alwaysPrepared.has(id)) {
          li.textContent += " (always prepared)";
          li.classList.add("prepared");
        } else if (prepared.has(id)) {
          li.classList.add("prepared");
        }

        // 📖 Click = view spell details only
        li.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          openSpellDetail(spell);
        };

        ul.appendChild(li);
      });

    details.appendChild(ul);
    container.appendChild(details);
  });
}
