import { character } from "../data/character.js";
import {
  spellLevelFromTags,
  isCantripFromTags,
  spellIdFromTitle
} from "../engine/rules/spellPrepRules.js";
import { openSpellDetail } from "./spellDetailModal.js";

/* ======================================================
   READ-ONLY SPELL LIST (click to view details)
====================================================== */
export async function renderSpellList() {
  const container = document.getElementById("spellList");
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

  const maxSpellLevel =
    character.spellcasting?.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  const choice =
    character.pendingChoices?.magicalSecrets ??
    character.pendingChoices?.spells ??
    null;

  const allowAnyList = choice?.from === "any";

  let spells = [];

  if (allowAnyList) {
    const classIds = [
      "bard", "cleric", "paladin", "ranger",
      "sorcerer", "warlock", "wizard", "artificer", "druid"
    ];

    for (const cid of classIds) {
      const r = await fetch(`../data/spells/${cid}.json`);
      if (!r.ok) continue;
      spells.push(...await r.json());
    }
  } else {
    const r = await fetch(`../data/spells/${character.class.id}.json`);
    if (!r.ok) {
      container.textContent = "Spell data missing.";
      return;
    }
    spells = await r.json();
  }

  // DEDUPE
  const seen = new Set();
  spells = spells.filter(s => {
    const id = spellIdFromTitle(s.title);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const byLevel = {};

  spells.forEach(spell => {
    const lvl = isCantripFromTags(spell.tags) ? 0 : spellLevelFromTags(spell.tags);
    if (lvl === null || lvl > maxSpellLevel) return;

    byLevel[lvl] ??= [];
    byLevel[lvl].push(spell);
  });

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  if (!levels.length) {
    container.textContent = "No spells available.";
    return;
  }

  levels.forEach(level => {
    const details = document.createElement("details");
    if (level === 0) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = level === 0 ? "Cantrips" : `Level ${level} Spells`;

    const ul = document.createElement("ul");

    byLevel[level]
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach(spell => {
        const id = spellIdFromTitle(spell.title);
        const li = document.createElement("li");
        li.textContent = spell.title;
        li.style.cursor = "pointer";

        if (alwaysPrepared.has(id)) {
          li.textContent += " (always prepared)";
          li.classList.add("prepared");
        } else if (prepared.has(id)) {
          li.classList.add("prepared");
        }

        li.onclick = e => {
          e.preventDefault();
          openSpellDetail(spell);
        };

        ul.appendChild(li);
      });

    details.append(summary, ul);
    container.appendChild(details);
  });
}

/* ======================================================
   SPELLS KNOWN (Bard / Sorcerer / Warlock) + Search picker
====================================================== */
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

  const maxSpellLevel =
    sc.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  /* =========================
     LOAD SPELL DATA
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
     DEDUPE
  ========================= */
  const seen = new Set();
  spells = spells.filter(s => {
    const id = spellIdFromTitle(s.title);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  /* =========================
     HEADER
  ========================= */
  const header = document.createElement("p");
  header.innerHTML = `<strong>${known.size} / ${maxKnown}</strong> spells known`;
  el.appendChild(header);

  /* =========================
     SPELL PICKER (SEARCHABLE)
  ========================= */
  if (remaining > 0) {
  const eligible = spells
    .filter(s => !isCantripFromTags(s.tags))
    .filter(s => spellLevelFromTags(s.tags) <= maxSpellLevel)
    .filter(s => !known.has(spellIdFromTitle(s.title)))
    .sort((a, b) => a.title.localeCompare(b.title));

  const learn = document.createElement("div");
  learn.className = "spells-known-learn";

  const hint = document.createElement("div");
  hint.className = "muted";
  hint.textContent = `Choose ${remaining} spell${remaining > 1 ? "s" : ""}.`;

  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search spells...";
  search.className = "spell-search";

  const dropdown = document.createElement("div");
  dropdown.className = "spell-dropdown";
  dropdown.hidden = true;

  const chips = document.createElement("div");
  chips.className = "spell-selected-chips";

  const counter = document.createElement("div");
  counter.className = "muted";

  const learnBtn = document.createElement("button");
  learnBtn.textContent = "Learn Spells";
  learnBtn.disabled = true;

  const selected = new Set();

  function updateUI() {
    counter.textContent = `${selected.size} / ${remaining} selected`;
    learnBtn.disabled = selected.size !== remaining;
    renderChips();
  }

  function renderChips() {
    chips.innerHTML = "";
    selected.forEach(id => {
      const spell = spells.find(s => spellIdFromTitle(s.title) === id);
      if (!spell) return;

      const chip = document.createElement("span");
      chip.className = "spell-chip";
      chip.textContent = spell.title;

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.onclick = () => {
        selected.delete(id);
        updateUI();
        renderDropdown(search.value);
      };

      chip.appendChild(remove);
      chips.appendChild(chip);
    });
  }

  function renderDropdown(filter = "") {
    dropdown.innerHTML = "";
    const q = filter.toLowerCase();

    eligible
      .filter(s => !selected.has(spellIdFromTitle(s.title)))
      .filter(s => s.title.toLowerCase().includes(q))
      .slice(0, 30)
      .forEach(spell => {
        const id = spellIdFromTitle(spell.title);

        const row = document.createElement("div");
        row.className = "spell-dropdown-row";
        row.textContent = spell.title;

        row.onclick = () => {
          if (selected.size >= remaining) return;
          selected.add(id);
          updateUI();
          renderDropdown(search.value);
        };

        dropdown.appendChild(row);
      });

    dropdown.hidden = dropdown.children.length === 0;
  }

  search.onfocus = () => {
    renderDropdown(search.value);
    dropdown.hidden = false;
  };

  search.oninput = () => {
    renderDropdown(search.value);
    dropdown.hidden = false;
  };

  document.addEventListener(
    "click",
    e => {
      if (!learn.contains(e.target)) dropdown.hidden = true;
    },
    { once: true }
  );

  learnBtn.onclick = () => {
    selected.forEach(id => known.add(id));

    if (isMagicalSecrets) {
      delete character.pendingChoices.magicalSecrets;
      character.resolvedChoices.magicalSecrets = true;
    } else {
      delete character.pendingChoices.spells;
      character.resolvedChoices.spells = true;
    }

    renderSpellsKnown();
  };

  updateUI();

  learn.append(hint, search, dropdown, chips, counter, learnBtn);
  el.appendChild(learn);
  }

  /* =========================
     KNOWN SPELLS (SOURCE OF TRUTH)
  ========================= */
  const knownHeader = document.createElement("div");
  knownHeader.className = "muted";
  knownHeader.style.marginTop = "10px";
  knownHeader.textContent = "Known spells:";
  el.appendChild(knownHeader);

  const knownList = document.createElement("div");
  knownList.className = "spells-known-list";

  [...known]
    .map(id => spells.find(s => spellIdFromTitle(s.title) === id))
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach(spell => {
      const row = document.createElement("div");
      row.className = "spell-row";
      row.textContent = spell.title;
      row.style.cursor = "pointer";
      row.onclick = () => openSpellDetail(spell);
      knownList.appendChild(row);
    });

  if (!knownList.children.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No spells known.";
    el.appendChild(empty);
  } else {
    el.appendChild(knownList);
  }
}
