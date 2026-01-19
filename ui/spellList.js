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
  const choice =
    character.pendingChoices?.magicalSecrets ??
    character.pendingChoices?.spells ??
    null;

  const allowAnyList = choice?.from === "any";


let spells = [];

if (allowAnyList) {
  // 🔑 Magical Secrets → load ALL spell lists
  const classIds = [
    "bard","cleric","paladin","ranger",
    "sorcerer","warlock","wizard","artificer","druid"
  ];

  for (const cid of classIds) {
    const r = await fetch(`../data/spells/${cid}.json`);
    if (!r.ok) continue;
    const data = await r.json();
    spells.push(...data);
  }
} else {
  // Normal behavior (unchanged)
  const res = await fetch(`../data/spells/${character.class.id}.json`);
  if (!res.ok) {
    el.textContent = "Spell data missing.";
    return;
  }
  spells = await res.json();
}

  /* =========================
    Deduplicate spells
  ========================= */
  const seen = new Set();

  spells = spells.filter(spell => {
    const id = spellIdFromTitle(spell.title);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  
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
  if (
    !sc?.enabled ||
    !["bard", "sorcerer", "warlock"].includes(character.class?.id)
  ) {
    el.textContent = "—";
    return;
  }

  sc.available ??= new Set();
  const known = sc.available;

  /* =========================
     Pending choice context
  ========================= */
  const choice =
    character.pendingChoices?.magicalSecrets ??
    character.pendingChoices?.spells ??
    null;

  const isMagicalSecrets =
  choice?.source === "magical-secrets" ||
  choice?.source === "lore";
  const allowAnyList = choice?.from === "any";

  const maxKnown = sc.spellsKnown ?? 0;
  const remaining = maxKnown - known.size;

  /* =========================
     Max spell level
  ========================= */
  const maxSpellLevel =
    sc.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  /* =========================
     Load spell lists
  ========================= */
  let spells = [];

  if (allowAnyList) {
    const classIds = [
      "bard","cleric","paladin","ranger",
      "sorcerer","warlock","wizard","artificer","druid"
    ];

    for (const cid of classIds) {
      const r = await fetch(`../data/spells/${cid}.json`);
      if (!r.ok) continue;
      spells.push(...await r.json());
    }
  } else {
    const r = await fetch(`../data/spells/${character.class.id}.json`);
    if (!r.ok) {
      el.textContent = "Spell data missing.";
      return;
    }
    spells = await r.json();
  }
  /* =========================
    Deduplicate spells (IMPORTANT)
  ========================= */
  const seen = new Set();

  spells = spells.filter(spell => {
    const id = spellIdFromTitle(spell.title);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  /* =========================
     Eligible spells
  ========================= */
  const eligible = spells
    .filter(s => !isCantripFromTags(s.tags))
    .filter(s => spellLevelFromTags(s.tags) <= maxSpellLevel)
    .filter(s => !known.has(spellIdFromTitle(s.title)))
    .sort((a, b) => a.title.localeCompare(b.title));

  /* =========================
     Header
  ========================= */
  const header = document.createElement("p");
 header.innerHTML = `<strong>${known.size} / ${maxKnown}</strong> spells known`;
  el.appendChild(header);

  /* =========================
     Learn UI
  ========================= */
  if (remaining > 0) {
    const learn = document.createElement("div");
    learn.className = "spells-known-learn";

    const hint = document.createElement("div");
    hint.className = "muted";
    hint.textContent = `Choose ${remaining} spell${remaining > 1 ? "s" : ""}.`;

    const select = document.createElement("select");
    select.multiple = true;

    eligible.forEach(spell => {
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

    if (isMagicalSecrets) {
      // 🔑 Magical Secrets permanently increases spells known

      delete character.pendingChoices.magicalSecrets;
      character.resolvedChoices.magicalSecrets = true;
    } else {
      delete character.pendingChoices.spells;
      character.resolvedChoices.spells = true;
    }


      renderSpellsKnown();
    };

    learn.append(hint, select, confirm);
    el.appendChild(learn);
  }

  /* =========================
     Known spells list
  ========================= */
  const list = document.createElement("div");
  list.className = "spells-known-list";

  spells
    .filter(spell => known.has(spellIdFromTitle(spell.title)))
    .forEach(spell => {
      const row = document.createElement("div");
      row.className = "spell-row";
      row.textContent = spell.title;
      row.onclick = () => openSpellDetail(spell);
      list.appendChild(row);
    });

  el.appendChild(list);
}


