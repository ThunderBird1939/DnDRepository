import { character } from "../data/character.js";
import { openSpellDetail } from "./spellDetailModal.js";
import {
  spellIdFromTitle,
  spellLevelFromTags,
  isCantripFromTags,
  maxWizardSpellLevel
} from "../engine/rules/spellPrepRules.js";

export async function renderSpellbook() {
  const el = document.getElementById("spellbookList");
  if (!el) return;

  el.innerHTML = "";

  const sc = character.spellcasting;

  // 🧙 Wizard only
  if (!sc?.enabled || character.class?.id !== "wizard") {
    el.textContent = "—";
    return;
  }

  sc.available ??= new Set();
  sc.prepared ??= new Set();

  const learned = sc.available;
  const toLearn = sc.spellsToLearn ?? 0;

  // Load full wizard spell list
  const res = await fetch(`./data/spells/wizard.json`);
  if (!res.ok) {
    el.textContent = "Spell data missing.";
    return;
  }

  const allSpells = await res.json();

  const maxLevel = maxWizardSpellLevel(character.level);

  // ❗ Wizard spellbook never includes cantrips
  const eligible = allSpells
    .filter(s => !isCantripFromTags(s.tags))
    .filter(s => spellLevelFromTags(s.tags) <= maxLevel)
    .sort((a, b) => a.title.localeCompare(b.title));

  /* =========================
     📘 HEADER
  ========================= */
  const header = document.createElement("p");
  header.innerHTML = `<strong>Spellbook</strong> (${learned.size} known)`;
  el.appendChild(header);

  /* =========================
     📚 LEARN SPELLS UI
  ========================= */
if (toLearn > 0) {
  const learnBlock = document.createElement("div");
  learnBlock.className = "spellbook-learn";

  const hint = document.createElement("div");
  hint.className = "muted";
  hint.textContent = `Choose ${toLearn} spell${toLearn > 1 ? "s" : ""} to add to your spellbook.`;

  const search = document.createElement("input");
  search.type = "text";
  search.placeholder = "Search spells...";
  search.className = "spell-search";

  const dropdown = document.createElement("div");
  dropdown.className = "spell-dropdown";

  const selectedList = document.createElement("div");
  selectedList.className = "spell-selected-list";

  const selected = new Set();

  const confirm = document.createElement("button");
  confirm.textContent = "Add to Spellbook";
  confirm.disabled = true;

  function updateConfirm() {
    confirm.disabled = selected.size !== toLearn;
  }

  function renderSelected() {
    selectedList.innerHTML = "";
    selected.forEach(id => {
      const spell = eligible.find(
        s => spellIdFromTitle(s.title) === id
      );
      if (!spell) return;

      const row = document.createElement("div");
      row.className = "spell-selected-row";
      row.textContent = spell.title;

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.onclick = () => {
        selected.delete(id);
        renderSelected();
        renderDropdown(search.value);
        updateConfirm();
      };

      row.appendChild(remove);
      selectedList.appendChild(row);
    });
  }

function renderDropdown(filter = "") {
  dropdown.innerHTML = "";

  eligible
    .filter(s => !selected.has(spellIdFromTitle(s.title)))
    .filter(s =>
      s.title.toLowerCase().includes(filter.toLowerCase())
    )
    .slice(0, 30)
    .forEach(spell => {
      const row = document.createElement("div");
      row.className = "spell-dropdown-row";
      row.textContent = spell.title;

      row.onclick = () => {
        if (selected.size >= toLearn) return;
        selected.add(spellIdFromTitle(spell.title));
        search.value = "";
        renderSelected();
        renderDropdown();
        updateConfirm();
      };

      dropdown.appendChild(row);
    });
}


  search.oninput = () => renderDropdown(search.value);
  search.onfocus = () => {
    renderDropdown(search.value);
  };

  confirm.onclick = () => {
    selected.forEach(id => learned.add(id));

    sc.spellsToLearn = 0;
    delete character.pendingChoices.spells;
    character.resolvedChoices.spells = true;

    renderSpellbook();
    window.dispatchEvent(new Event("spellbook-updated"));
  };

  learnBlock.append(
    hint,
    search,
    dropdown,
    selectedList,
    confirm
  );
  el.appendChild(learnBlock);
}


  /* =========================
     📖 KNOWN SPELLS LIST (FIXED)
     Source of truth = learned IDs
  ========================= */
  const knownHeader = document.createElement("div");
  knownHeader.className = "muted";
  knownHeader.style.marginTop = "10px";
  knownHeader.textContent = "Known spells:";
  el.appendChild(knownHeader);

  if (learned.size === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No spells in spellbook.";
    el.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "spellbook-known";

  [...learned]
    .map(id => eligible.find(s => spellIdFromTitle(s.title) === id))
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach(spell => {
      const row = document.createElement("div");
      row.className = "spellbook-row";
      row.textContent = spell.title;
      row.style.cursor = "pointer";
      row.onclick = () => openSpellDetail(spell);
      list.appendChild(row);
    });

  el.appendChild(list);
}
