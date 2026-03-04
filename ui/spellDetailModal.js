import { character } from "../data/character.js";
import {
  spellLevelFromTags,
  isCantripFromTags
} from "../engine/rules/spellPrepRules.js";

const modal = document.getElementById("spellDetailModal");
const backdrop = document.getElementById("spellDetailBackdrop");
const titleEl = document.getElementById("spellDetailTitle");
const bodyEl = document.getElementById("spellDetailBody");
const closeBtn = document.getElementById("closeSpellDetail");

function renderSpellContents(contents = []) {
  bodyEl.innerHTML = "";

  contents.forEach(line => {
    const [type, ...rest] = line.split(" | ");
    const value = rest.join(" | ");

    if (type === "subtitle") {
      const p = document.createElement("p");
      p.className = "spell-subtitle";
      p.textContent = value;
      bodyEl.appendChild(p);
    } else if (type === "property") {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${rest[0]}:</strong> ${rest[1]}`;
      bodyEl.appendChild(p);
    } else if (type === "section") {
      const h = document.createElement("h4");
      h.textContent = value;
      bodyEl.appendChild(h);
    } else if (type === "text") {
      const p = document.createElement("p");
      p.textContent = value;
      bodyEl.appendChild(p);
    } else if (type === "rule") {
      bodyEl.appendChild(document.createElement("hr"));
    }
  });
}

function buildCastControls(spell) {
  const wrapper = document.createElement("div");
  wrapper.className = "spell-cast-controls";

  const slots = character.spellcasting?.slots;
  const baseLevel = isCantripFromTags(spell.tags) ? 0 : spellLevelFromTags(spell.tags);
  const maxBySlots = slots?.max
    ? Math.max(
        0,
        ...Object.keys(slots.max)
          .map(Number)
          .filter(n => Number.isFinite(n) && Number(slots.max[n]) > 0)
      )
    : 0;

  const castableMax = Math.max(Number(baseLevel || 0), maxBySlots);
  const levelSelect = document.createElement("select");
  for (let lvl = Number(baseLevel || 0); lvl <= castableMax; lvl += 1) {
    const opt = document.createElement("option");
    opt.value = String(lvl);
    if (lvl === 0) {
      opt.textContent = "Cantrip";
    } else {
      const used = Number(slots?.used?.[lvl] ?? 0);
      const max = Number(slots?.max?.[lvl] ?? 0);
      const remaining = Math.max(0, max - used);
      opt.textContent = `Level ${lvl} (${remaining}/${max})`;
      opt.disabled = remaining <= 0;
    }
    levelSelect.appendChild(opt);
  }

  const castBtn = document.createElement("button");
  castBtn.type = "button";
  castBtn.textContent = "Cast Spell";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.textContent = "Undo Last Cast";

  const feedback = document.createElement("div");
  feedback.className = "muted";
  feedback.textContent = "Choose level and cast.";

  castBtn.onclick = () => {
    const level = Number(levelSelect.value || 0);
    window.dispatchEvent(
      new CustomEvent("cast-spell-at-level", {
        detail: { spell: spell.title, level }
      })
    );
    feedback.textContent =
      level > 0
        ? `${spell.title} cast at level ${level}.`
        : `${spell.title} cast as a cantrip.`;
  };

  undoBtn.onclick = () => {
    window.dispatchEvent(new Event("undo-last-spell-cast"));
    feedback.textContent = "Last cast reverted if possible.";
  };

  wrapper.append(levelSelect, castBtn, undoBtn, feedback);
  return wrapper;
}

export function openSpellDetail(spell) {
  titleEl.textContent = spell.title;
  renderSpellContents(spell.contents);
  bodyEl.appendChild(buildCastControls(spell));

  modal.hidden = false;
  backdrop.hidden = false;
}

closeBtn.onclick = () => {
  modal.hidden = true;
  backdrop.hidden = true;
};
