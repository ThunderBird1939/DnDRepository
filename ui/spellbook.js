import { character } from "../data/character.js";
import { openSpellDetail } from "./spellDetailModal.js";
import {
  spellIdFromTitle,
  spellLevelFromTags,
  isCantripFromTags        // ✅ ADD
} from "../engine/rules/spellPrepRules.js";
import { maxWizardSpellLevel } from "../engine/rules/spellPrepRules.js";

export async function renderSpellbook() {
  const el = document.getElementById("spellbookList");
  if (!el) return;

  el.innerHTML = "";

  const sc = character.spellcasting;

  // 🧙 Wizard-only
  if (!sc?.enabled || character.class?.id !== "wizard") {
    el.textContent = "—";
    return;
  }

  sc.available ??= new Set();
  sc.prepared ??= new Set();

  const learned = sc.available;
  const toLearn = sc.spellsToLearn ?? 0;

  const res = await fetch(`./data/spells/${character.class.id}.json`);
  const spells = await res.json();

  const maxLevel = maxWizardSpellLevel(character.level);

  // 🚫 EXCLUDE CANTRIPS FROM SPELLBOOK ENTIRELY
  const eligible = spells
    .filter(s => !isCantripFromTags(s.tags))                 // ✅ FIX
    .filter(s => spellLevelFromTags(s.tags) <= maxLevel)
    .sort((a, b) => a.title.localeCompare(b.title));

  /* =========================
     📘 SPELLBOOK HEADER
  ========================= */
  const header = document.createElement("p");
  header.innerHTML = `<strong>Spellbook</strong> (${learned.size} known)`;
  el.appendChild(header);

  /* =========================
     ➕ LEARN SPELLS (DROPDOWN)
  ========================= */
  if (toLearn > 0) {
    const learnBlock = document.createElement("div");
    learnBlock.className = "spellbook-learn";

    const hint = document.createElement("div");
    hint.className = "muted";
    hint.textContent = `Choose ${toLearn} spell${toLearn > 1 ? "s" : ""} to add to your spellbook.`;

    const select = document.createElement("select");
    select.multiple = true;

    eligible
      .filter(s => !learned.has(spellIdFromTitle(s.title)))
      .forEach(spell => {
        const opt = document.createElement("option");
        opt.value = spellIdFromTitle(spell.title);
        opt.textContent = spell.title;
        select.appendChild(opt);
      });

    const confirm = document.createElement("button");
    confirm.textContent = "Add to Spellbook";
    confirm.disabled = true;

    select.onchange = () => {
      confirm.disabled = select.selectedOptions.length !== toLearn;
    };

    confirm.onclick = () => {
      [...select.selectedOptions].forEach(opt => {
        learned.add(opt.value);
      });

      sc.spellsToLearn = 0;

      // 🔑 RESOLVE PENDING CHOICE (IMPORTANT)
      delete character.pendingChoices?.spells;
      character.resolvedChoices.spells = true;

      renderSpellbook();
      window.dispatchEvent(new Event("spellbook-updated"));
    };

    learnBlock.append(hint, select, confirm);
    el.appendChild(learnBlock);
  }

  /* =========================
     📖 KNOWN SPELLS LIST
  ========================= */
  if (learned.size === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No spells in spellbook.";
    el.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "spellbook-known";

  eligible
    .filter(spell => learned.has(spellIdFromTitle(spell.title)))
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
