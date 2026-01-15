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
/**
 * Render Spells Known (Bard / Sorcerer / Warlock)
 * - Checkbox selection
 * - Enforces spellsKnown limit
 * - Mutates spellcasting.available
 */
export async function renderSpellsKnown() {
  const el = document.getElementById("spellsKnownList");
  if (!el) return;

  el.innerHTML = "";

  const sc = character.spellcasting;

  // 🎵 Known-spell casters only
  if (
    !sc?.enabled ||
    !["bard", "sorcerer", "warlock"].includes(character.class?.id)
  ) {
    el.textContent = "—";
    return;
  }

  sc.available ??= new Set();

  const known = sc.available;
  const toChoose = sc.spellsKnown ?? 0;

  // Max spell level from slots
  const maxSpellLevel =
    sc.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  const res = await fetch(`./data/spells/${character.class.id}.json`);
  if (!res.ok) {
    el.textContent = "Spell data missing.";
    return;
  }

  const spells = await res.json();

  // 🚫 No cantrips here
  const eligible = spells
    .filter(s => !isCantripFromTags(s.tags))
    .filter(s => spellLevelFromTags(s.tags) <= maxSpellLevel)
    .sort((a, b) => a.title.localeCompare(b.title));

  /* =========================
     HEADER
  ========================= */
  const header = document.createElement("p");
  header.innerHTML = `<strong>${known.size} / ${toChoose}</strong> spells known`;
  el.appendChild(header);

  /* =========================
     LEARN SPELLS (DROPDOWN)
  ========================= */
  const remaining = toChoose - known.size;

  if (remaining > 0) {
    const learnBlock = document.createElement("div");
    learnBlock.className = "spells-known-learn";

    const hint = document.createElement("div");
    hint.className = "muted";
    hint.textContent = `Choose ${remaining} spell${remaining > 1 ? "s" : ""}.`;

    const select = document.createElement("select");
    select.multiple = true;

    eligible
      .filter(s => !known.has(spellIdFromTitle(s.title)))
      .forEach(spell => {
        const opt = document.createElement("option");
        opt.value = spellIdFromTitle(spell.title);
        opt.textContent = spell.title;
        select.appendChild(opt);
      });

    const confirm = document.createElement("button");
    confirm.textContent = "Learn Spells";
    confirm.disabled = true;

    select.onchange = () => {
      confirm.disabled = select.selectedOptions.length !== remaining;
    };

    confirm.onclick = () => {
      [...select.selectedOptions].forEach(opt => {
        known.add(opt.value);
      });

      // 🔑 resolve pending choice
      delete character.pendingChoices?.spells;
      character.resolvedChoices.spells = true;

      renderSpellsKnown();
    };

    learnBlock.append(hint, select, confirm);
    el.appendChild(learnBlock);
  }

  /* =========================
     KNOWN SPELLS LIST
  ========================= */
  if (known.size === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No spells known.";
    el.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "spells-known-list";

  eligible
    .filter(spell => known.has(spellIdFromTitle(spell.title)))
    .forEach(spell => {
      const row = document.createElement("div");
      row.className = "spell-row";
      row.textContent = spell.title;
      row.style.cursor = "pointer";
      row.onclick = () => openSpellDetail(spell);
      list.appendChild(row);
    });

  el.appendChild(list);
}

