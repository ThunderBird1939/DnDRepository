/* =========================
   Imports
========================= */
import { character } from "./data/character.js";
window.character = character;
import { initWeaponAndSpellSelects } from "./ui/dropdowns.js";
import { loadClass } from "./data/classloader.js";
import { applyClass } from "./engine/applyClass.js";
import { applySubclass } from "./engine/applySubclass.js";
import { renderSkillChoice } from "./ui/skillChoice.js";
import { renderFeatures } from "./ui/features.js";
import { renderSpellcasting } from "./ui/spells.js";
import { renderSpellList } from "./ui/spellList.js";
import { renderPreparedSpells } from "./ui/preparedSpells.js";
import { openDetail } from "./ui/router.js";
import { renderAlwaysPreparedSpells } from "./ui/alwaysPreparedSpells.js";
import { calculateArmorClass } from "./engine/calculateArmorClass.js";
import { renderCantripsKnown } from "./ui/cantripsKnown.js";
import { renderSpellbook } from "./ui/spellbook.js";

/* =========================
   Helpers
========================= */
const ELDRITCH_CANNON_DESCRIPTIONS = {
  "force-ballista":
    "The cannon makes a ranged spell attack, dealing force damage and pushing the target up to 5 feet away.",
  "flamethrower":
    "The cannon exhales fire in a 15-foot cone. Creatures in the area take fire damage on a failed Dexterity save, or half as much on a success.",
  "protector":
    "The cannon grants temporary hit points to creatures of your choice within 10 feet."
};

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level) {
  return Math.ceil(1 + level / 4);
}
function updateArmorLockUI() {
  const armorSelect = document.getElementById("armorSelect");
  const shieldToggle = document.getElementById("shieldToggle");

  if (!armorSelect) return;

  const locked = !!character.combat?.arcaneArmor;

  armorSelect.disabled = locked;

  if (shieldToggle) {
    shieldToggle.disabled = locked;
  }
}
function parseBackground(bg) {
  const parsed = {
    skills: [],
    languages: null,
    features: [],
    equipment: []
  };

  bg.contents.forEach(line => {
    // Skills
    if (line.includes("Skill Proficiencies:")) {
      parsed.skills = line
        .split(":")[1]
        .split(",")
        .map(s => s.trim().toLowerCase().replace(/\s+/g, ""));
    }

    // Equipment (display only)
    if (line.includes("Equipment:")) {
      parsed.equipment = line
        .split(":")[1]
        .split(",")
        .map(s => s.trim());
    }

    // Feature
    if (line.startsWith("Feature:")) {
      const name = line.replace("Feature:", "").trim();
      parsed.features.push({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        source: "background"
      });
    }
  });

  return parsed;
}
let languageChoices;

async function initLanguageSelect() {
  const el = document.getElementById("languageSelect");
  if (!el) return;

  el.innerHTML = "";

  const res = await fetch("./data/languages.json");
  if (!res.ok) {
    console.error("Failed to load languages.json");
    return;
  }

  const languages = await res.json();

  languages.forEach(lang => {
    const opt = document.createElement("option");
    opt.value = lang; // "common"
    opt.textContent = lang
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "); // "Deep Speech"

    el.appendChild(opt);
  });

  languageChoices = new Choices(el, {
    removeItemButton: true,
    shouldSort: false,
    placeholderValue: "Select languages"
  });

  el.addEventListener("change", () => {
    character.proficiencies.languages = new Set(
      [...el.selectedOptions].map(o => o.value)
    );
  });

  syncLanguagesUI();
}

function applyBackground(bg) {
  const parsed = parseBackground(bg);

  /* ===== Identity ===== */
  character.background = {
    id: bg.id,
    name: bg.title,
    source: "background"
  };

  /* ===== Skills ===== */
  parsed.skills.forEach(skill => {
    character.proficiencies.skills.add(skill);
  });

  /* ===== Languages ===== */
  if (parsed.languages) {
    character.pendingChoices.languages = {
      ...parsed.languages,
      source: "background"
    };
  }

  /* ===== Features ===== */
  parsed.features.forEach(f => {
    if (!character.features.some(x => x.id === f.id)) {
      character.features.push(f);
    }
  });

  /* ===== Equipment (display only) ===== */
  character.backgroundEquipment = parsed.equipment;

  window.dispatchEvent(new Event("background-applied"));
}

function renderActiveInfusions() {
  const container = document.getElementById("activeInfusionsList");
  const counterEl = document.getElementById("activeInfusionsCounter");
  if (!container || !counterEl) return;

  container.innerHTML = "";

  // Guard: no level or too low
  if (character.level == null || character.level < 2) {
    counterEl.textContent = "";
    container.textContent = "—";
    return;
  }

  const maxActive = getMaxActiveInfusions(character.level);
  const activeCount = character.infusions.active.size;

  // Counter
  counterEl.textContent = `Active Infusions: ${activeCount} / ${maxActive}`;

  if (character.infusions.known.size === 0) {
    container.textContent = "—";
    return;
  }

  character.infusions.known.forEach(infusionId => {
    const inf = allInfusions.find(i => i.id === infusionId);
    if (!inf) return;

    const row = document.createElement("div");
    row.className = "feature";

    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "0.5rem";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = character.infusions.active.has(infusionId);

    // Disable unchecked boxes if limit reached
    if (!checkbox.checked && activeCount >= maxActive) {
      checkbox.disabled = true;
    }

    checkbox.onchange = () => {
      if (checkbox.checked) {
        if (character.infusions.active.size >= maxActive) {
          checkbox.checked = false;
          return;
        }
        character.infusions.active.add(infusionId);
      } else {
        character.infusions.active.delete(infusionId);
      }

      applyInfusionEffects();
      renderAttacks();
      renderActiveInfusions(); // state-driven re-render
    };

    const name = document.createElement("strong");
    name.textContent = inf.name;

    const desc = document.createElement("div");
    desc.textContent = inf.description;
    desc.style.marginLeft = "1.5rem";

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" "));
    label.appendChild(name);

    row.appendChild(label);
    row.appendChild(desc);

    /* =========================
       🎯 TARGET SELECTION UI
       (STATE-DRIVEN, NOT EVENT-DRIVEN)
    ========================= */
    if (checkbox.checked) {
      let options = [];

      if (inf.type === "weapon") {
        options = (character.weapons || [])
          .map(wid => {
            const w = ALL_WEAPONS.find(w => w.id === wid);
            return w ? { value: wid, label: w.name } : null;
          })
          .filter(Boolean);
      }

      if (inf.type === "armor" || inf.type === "item") {
        options.push({ value: "armor", label: "Equipped Armor" });
        if (character.equipment?.shield) {
          options.push({ value: "shield", label: "Shield" });
        }
      }

      if (options.length > 0) {
        const targetSelect = document.createElement("select");
        targetSelect.style.marginLeft = "1.5rem";
        targetSelect.style.marginTop = "0.25rem";

        options.forEach(opt => {
          const o = document.createElement("option");
          o.value = opt.value;
          o.textContent = opt.label;
          targetSelect.appendChild(o);
        });

        const savedTarget = character.infusions.targets[infusionId];

        if (savedTarget) {
          targetSelect.value = savedTarget;
        } else if (options.length === 1) {
          // 🔑 AUTO-ASSIGN when only one valid target exists
          character.infusions.targets[infusionId] = options[0].value;
          targetSelect.value = options[0].value;
        }

        targetSelect.onchange = () => {
          character.infusions.targets[infusionId] = targetSelect.value;
          applyInfusionEffects();
          renderAttacks();
};


        row.appendChild(targetSelect);
      }
    }

    container.appendChild(row);
  });
}

function populateBackgroundDropdown() {
  const select = document.getElementById("backgroundSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— Select Background —</option>`;

  backgrounds.forEach(bg => {
    const opt = document.createElement("option");
    opt.value = bg.id;
    opt.textContent = bg.title;
    select.appendChild(opt);
  });
}


function applyInfusionEffects() {
  character.infusions.targets ??= {};
  // clear ONLY infusion flags
  delete character.combat.infusedWeapon;
  delete character.combat.infusedArmor;
  delete character.combat.infusedShield;

  character.infusions.active.forEach(id => {
    const inf = allInfusions.find(i => i.id === id);
    if (!inf) return;

    const target = character.infusions.targets[id];

    if (inf.type === "weapon") {
      character.combat.infusedWeapon = target;
    }

    if (inf.type === "armor" || inf.type === "item") {
      if (target === "shield") {
        character.combat.infusedShield = true;
      } else {
        character.combat.infusedArmor = true;
      }
    }
  });
}

function checkArcaneShotUnlocks(prevLevel, newLevel) {
  if (
    character.class?.id !== "fighter" ||
    character.subclass?.id !== "arcane-archer"
  ) return;

  ensureArcaneShotState();

  const prevMax = getMaxArcaneShotsKnown(prevLevel);
  const newMax  = getMaxArcaneShotsKnown(newLevel);

  if (newMax <= prevMax) return;

  const known = character.combat.arcaneShot.knownShots.size;
  const toChoose = newMax - known;

  if (toChoose > 0) {
    character.pendingChoices ??= {};
    character.pendingChoices.arcaneShots = { choose: toChoose };

    character.resolvedChoices ??= {};
    character.resolvedChoices.arcaneShots = false;
  }
}

function renderInfusions() {
  const artificerInfusions = allInfusions; // ✅ FIX
  const panel = document.getElementById("infusionsPanel");
  const knownBlock = document.getElementById("knownInfusionsBlock");
  const activeBlock = document.getElementById("activeInfusionsBlock");
  const select = document.getElementById("infusionsSelect");
  const hint = document.getElementById("infusionsHint");

  // ❌ Not an artificer → hide everything
  if (character.class?.id !== "artificer") {
    panel.hidden = true;
    return;
  }
if (character.level == null || character.level < 2) {
  panel.hidden = true;
  return;
}

  panel.hidden = false;

  const maxKnown = getMaxInfusionsKnown(character.level);

  // ❌ Below level 2 → nothing
  if (maxKnown === 0) {
    knownBlock.hidden = true;
    activeBlock.hidden = true;
    return;
  }

  activeBlock.hidden = false;

  const needsSelection =
    character.infusions.known.size < maxKnown;

  // ✅ KNOWN INFUSIONS (learning state)
  knownBlock.hidden = !needsSelection;

  if (needsSelection) {
    hint.textContent = `Choose ${maxKnown - character.infusions.known.size} infusion(s).`;

    // populate dropdown
    select.innerHTML = "";

    artificerInfusions.forEach(inf => {
      const opt = document.createElement("option");
      opt.value = inf.id;
      opt.textContent = inf.name;

      // ✅ CRITICAL FIX
      if (character.infusions.known.has(inf.id)) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });


    if (infusionChoices) {
      infusionChoices.destroy();
      infusionChoices = null;
    }

    infusionChoices = new Choices(select, {
      removeItemButton: true,
      maxItemCount: maxKnown,
      shouldSort: false
    });

    select.addEventListener("change", () => {
  const selected = infusionChoices.getValue(true);

  character.infusions.known = new Set(selected);
  character.resolvedChoices.infusions =
    character.infusions.known.size >= maxKnown;
  renderActiveInfusions();
});
  }
  // ✅ ACTIVE INFUSIONS DISPLAY
  renderActiveInfusions();
}

function updateSpellcastingVisibility() {
  const panel = document.querySelector(".spellcasting-panel");
  if (!panel) return;

  panel.hidden = !character.spellcasting?.enabled;
}


function updateInfusionsVisibility(classData) {
  const panel = document.getElementById("infusionsPanel");
  if (!panel) return;

  // Only Artificer shows infusions
  panel.hidden = !(classData?.id === "artificer");
}



function applyShortRest() {
  const log = [];

  // =========================
  // FIGHTER
  // =========================
  if (character.class?.id === "fighter") {
    if (character.combat?.secondWind) {
      character.combat.secondWind.used = false;
      log.push("Second Wind refreshed");
    }

    if (character.combat?.actionSurge) {
      character.combat.actionSurge.usesUsed = 0;
      log.push("Action Surge refreshed");
    }

    if (character.combat?.superiority) {
      character.combat.superiority.diceUsed = 0;
      log.push("Superiority Dice refreshed");
    }

    if (character.combat?.runes) {
      character.combat.runes.uses = character.combat.runes.usesMax ?? 1;
      log.push("Runes refreshed");
    }
    if (character.combat?.indomitable) {
      character.combat.indomitable.usesUsed = 0;
      log.push("Indomitable refreshed");
    }
  }

  // =========================
  // GENERIC (future)
  // =========================
  window.dispatchEvent(new Event("rest-short"));

  updateFighterButtons?.();
  updateRestLog(log, "Short Rest");
}
function applyLongRest() {
  const log = [];

  // =========================
  // HIT POINTS
  // =========================
  character.currentHp = character.maxHp;
  log.push("HP fully restored");

  // =========================
  // FIGHTER
  // =========================
  if (character.class?.id === "fighter") {
    if (character.combat?.secondWind) {
      character.combat.secondWind.used = false;
      log.push("Second Wind refreshed");
    }

    if (character.combat?.actionSurge) {
      character.combat.actionSurge.usesUsed = 0;
      log.push("Action Surge refreshed");
    }

    if (character.combat?.superiority) {
      character.combat.superiority.diceUsed = 0;
      log.push("Superiority Dice refreshed");
    }

    if (character.combat?.psionic) {
      character.combat.psionic.diceUsed = 0;
      log.push("Psionic Energy refreshed");
    }

    if (character.combat?.runes) {
      character.combat.runes.uses = character.combat.runes.usesMax ?? 1;
      log.push("Runes refreshed");
    }

    if (character.combat?.echo) {
      character.combat.echo.unleashUses =
        Math.max(1, Math.floor((character.abilities.con - 10) / 2));
      log.push("Echo resources refreshed");
    }
  }
  // =========================
  // ARTIFICIER
  // =========================
if (character.class?.id === "artificer") {
  window.dispatchEvent(new Event("artificer-long-rest"));
}

  // =========================
  // SPELLCASTING
  // =========================
    if (character.spellcasting?.slots) {
      log.push("Spell slots refreshed");
    }

  // =========================
  // SPELL SLOTS (LONG REST)
  // =========================
  if (character.spellcasting?.slots) {
    for (const lvl in character.spellcasting.slots.used) {
      character.spellcasting.slots.used[lvl] = 0;
    }
}

  // =========================
  // GENERIC EVENT
  // =========================
  window.dispatchEvent(new Event("rest-long"));

  updateFighterButtons?.();
  updateRestLog(log, "Long Rest");
}
async function getSpellSlotsForClass(classId, level) {
  const res = await fetch(`./data/spellslots/${classId}.json`);

  if (!res.ok) {
    console.warn(`No spell slot table for class: ${classId}`);
    return {};
  }

  const table = await res.json();

  return table[level] ?? {};
}
async function loadCantripsKnown(classId, level) {
  try {
    const res = await fetch(
      `./data/cantripsKnown/${classId}.json`
    );
    if (!res.ok) return 0;

    const table = await res.json();
    return table[String(level)] ?? 0;
  } catch {
    return 0;
  }
}

async function initSpellSlots() {
  if (!character.spellcasting?.enabled) return;

  /* =========================
     CANTRIPS (SEPARATE SYSTEM)
  ========================= */
  character.spellcasting.cantrips ??= new Set();

  character.spellcasting.cantripsKnown =
    await loadCantripsKnown(
      character.class.id,
      character.level
    );

  // Clamp known cantrips if level dropped
  if (
    character.spellcasting.cantrips.size >
    character.spellcasting.cantripsKnown
  ) {
    character.spellcasting.cantrips = new Set(
      [...character.spellcasting.cantrips].slice(
        0,
        character.spellcasting.cantripsKnown
      )
    );
  }

  /* =========================
     SPELL SLOTS (LEVEL 1–9)
  ========================= */
  character.spellcasting.slots.max = {};
  character.spellcasting.slots.used ??= {};

  const slotsByLevel =
    character.spellcasting.slotsPerLevel ?? [];

  slotsByLevel.forEach((count, i) => {
    const lvl = i + 1;

    character.spellcasting.slots.max[lvl] = count;
    character.spellcasting.slots.used[lvl] ??= 0;

    if (character.spellcasting.slots.used[lvl] > count) {
      character.spellcasting.slots.used[lvl] = count;
    }
  });
}


function renderSpellSlots() {
  const el = document.getElementById("spellSlots");
  if (!el || !character.spellcasting?.slots) return;

  el.innerHTML = "";

  const { max, used } = character.spellcasting.slots;

  Object.keys(max).forEach(lvl => {
    const maxSlots = max[lvl];
    if (!maxSlots) return;

    const usedSlots = used[lvl] ?? 0;
    const remaining = maxSlots - usedSlots;

    const row = document.createElement("div");
    row.className = "spell-slot-row";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "0.5rem";

    const label = document.createElement("span");
    label.textContent = `Level ${lvl}: ${remaining} / ${maxSlots}`;
    label.style.minWidth = "120px";

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "−";
    minusBtn.disabled = usedSlots === 0;

    minusBtn.onclick = () => {
      refundSpellSlot(Number(lvl));
      renderSpellSlots();
    };

    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";
    plusBtn.disabled = remaining === 0;

    plusBtn.onclick = () => {
      useSpellSlot(Number(lvl));
      renderSpellSlots();
    };

    row.appendChild(label);
    row.appendChild(minusBtn);
    row.appendChild(plusBtn);

    el.appendChild(row);
  });
}

function syncLanguagesUI() {
  if (!languageChoices) return;

  languageChoices.removeActiveItems();

  character.proficiencies.languages.forEach(langId => {
    languageChoices.setChoiceByValue(langId);
  });
}

function updateRestLog(entries, type) {
  const el = document.getElementById("restLog");
  if (!el) return;

  el.innerHTML = `
    <strong>${type}</strong><br>
    ${entries.map(e => `• ${e}`).join("<br>")}
  `;
}

function useSpellSlot(level) {
  const slots = character.spellcasting?.slots;
  if (!slots) return false;

  if (
    slots.used[level] >= slots.max[level]
  ) {
    alert(`No level ${level} spell slots remaining`);
    return false;
  }

  slots.used[level] += 1;
  window.dispatchEvent(new Event("spell-slots-updated"));
  return true;
}

function refundSpellSlot(level) {
  const slots = character.spellcasting?.slots;
  if (!slots) return;

  slots.used[level] = Math.max(0, slots.used[level] - 1);
  window.dispatchEvent(new Event("spell-slots-updated"));
}

function getMaxInfusionsKnown(level) {
  if (level >= 14) return 8;
  if (level >= 10) return 6;
  if (level >= 6)  return 6;
  if (level >= 2)  return 4;
  return 0;
}

function getMaxActiveInfusions(level) {
  if (level >= 14) return 5;
  if (level >= 10) return 4;
  if (level >= 6)  return 3;
  if (level >= 2)  return 2;
  return 0;
}

function getMaxArcaneShotsKnown(level) {
  if (level >= 15) return 5;
  if (level >= 10) return 4;
  if (level >= 7)  return 3;
  if (level >= 3)  return 2;
  return 0;
}

function updateFighterUI() {
  const block = document.getElementById("fighterResources");
  if (!block) return;

  if (character.class?.id === "fighter") {
    block.hidden = false;
    updateFighterButtons();
  } else {
    block.hidden = true;
  }
}

function updateFighterButtons() {
  const isFighter = character.class?.id === "fighter";

  // =========================
  // Second Wind (Lv 1)
  // =========================
  const swBtn = document.getElementById("secondWindBtn");
  const swText = document.getElementById("secondWindStatus");

  if (isFighter && character.combat?.secondWind && swBtn && swText) {
    swBtn.hidden = false;
    swBtn.disabled = character.combat.secondWind.used;
    swText.textContent = character.combat.secondWind.used
      ? "Used (short rest)"
      : "Available";
  } else if (swBtn && swText) {
    swBtn.hidden = true;
    swText.textContent = "";
  }

  // =========================
  // Action Surge (Lv 2)
  // =========================
  const asBtn = document.getElementById("actionSurgeBtn");
  const asText = document.getElementById("actionSurgeStatus");

  if (isFighter && character.combat?.actionSurge && asBtn && asText) {
    asBtn.hidden = false;
    asBtn.disabled =
      character.combat.actionSurge.usesUsed >=
      character.combat.actionSurge.usesMax;

    asText.textContent =
      `${character.combat.actionSurge.usesMax -
        character.combat.actionSurge.usesUsed} remaining`;
  } else if (asBtn && asText) {
    asBtn.hidden = true;
    asText.textContent = "";
  }

  // =========================
  // Indomitable (Lv 9)
  // =========================
  const indBtn = document.getElementById("indomitableBtn");
  const indText = document.getElementById("indomitableStatus");

  if (isFighter && character.combat?.indomitable && indBtn && indText) {
    indBtn.hidden = false;
    indBtn.disabled =
      character.combat.indomitable.usesUsed >=
      character.combat.indomitable.usesMax;

    indText.textContent =
      `${character.combat.indomitable.usesMax -
        character.combat.indomitable.usesUsed} remaining`;
  } else if (indBtn && indText) {
    indBtn.hidden = true;
    indText.textContent = "";
  }
}

async function loadArcaneShots() {
  if (ALL_ARCANE_SHOTS.length) return ALL_ARCANE_SHOTS;

  const res = await fetch("./data/arcaneShots.json");
  if (!res.ok) {
    console.error("Failed to load arcaneShots.json", res.status);
    return [];
  }

  ALL_ARCANE_SHOTS = await res.json();
  return ALL_ARCANE_SHOTS;
}

function updateArcaneShotActiveUI() {
  const block = document.getElementById("activeArcaneShotsBlock");
  if (!block) return;

  const hasKnownShots =
    character.class?.id === "fighter" &&
    character.subclass?.id === "arcane-archer" &&
    character.combat?.arcaneShot?.knownShots?.size > 0;

  block.hidden = !hasKnownShots;

  if (hasKnownShots) {
    renderArcaneShotUseDropdown();
    renderArcaneShotDetails();
  }
}

async function initArcaneShotKnownUI() {
  const block  = document.getElementById("knownArcaneShotsBlock");
  const select = document.getElementById("arcaneShotsLearnSelect");
  const hint   = document.getElementById("arcaneShotsHint");

  if (
    !block ||
    character.class?.id !== "fighter" ||
    character.subclass?.id !== "arcane-archer"
  ) {
    block.hidden = true;
    arcaneShotChoices?.destroy?.();
    arcaneShotChoices = null;
    return;
  }

  ensureArcaneShotState();
  await loadArcaneShots();

  const maxKnown = getMaxArcaneShotsKnown(character.level);
  const known = character.combat.arcaneShot.knownShots;

  // 🔑 Nothing to learn
  if (known.size >= maxKnown) {
    if (character.pendingChoices?.arcaneShots) {
  delete character.pendingChoices.arcaneShots;
}
    character.resolvedChoices.arcaneShots = true;
    block.hidden = true;
    arcaneShotChoices?.destroy?.();
    arcaneShotChoices = null;
    return;
  }

  // 👇 learning UI shows
  block.hidden = false;

  const remaining = maxKnown - known.size;
  hint.textContent = `Choose ${remaining} Arcane Shot option(s).`;

  select.innerHTML = "";

  ALL_ARCANE_SHOTS
    .filter(s => (s.level ?? 0) <= character.level)
    .forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;

      if (known.has(s.id)) opt.selected = true;
      select.appendChild(opt);
    });

  arcaneShotChoices?.destroy?.();
  arcaneShotChoices = new Choices(select, {
    removeItemButton: true,
    maxItemCount: maxKnown,
    shouldSort: false,
    searchEnabled: true
  });

  select.onchange = () => {
    const selected = arcaneShotChoices.getValue(true);

    // 🔑 MERGE — never replace
    selected.forEach(id => known.add(id));

    const left = maxKnown - known.size;
    hint.textContent =
      left > 0
        ? `Choose ${left} Arcane Shot option(s).`
        : `Arcane Shots learned.`;

    if (left <= 0) {
      delete character.pendingChoices.arcaneShots;
      character.resolvedChoices.arcaneShots = true;

      arcaneShotChoices.destroy();
      arcaneShotChoices = null;
      block.hidden = true;

      updateArcaneShotActiveUI();
      renderArcaneShotDetails();
      renderArcaneShotUseDropdown();
    }
  };
}


function ensureArcaneShotState() {
  character.combat ??= {};

  if (!character.combat.arcaneShot) {
    character.combat.arcaneShot = {
      usesMax: 2,
      usesUsed: 0,
      knownShots: new Set(),
      activeShot: null
    };
  }

  // Repair if it ever got serialized
  if (!(character.combat.arcaneShot.knownShots instanceof Set)) {
    character.combat.arcaneShot.knownShots =
      new Set(character.combat.arcaneShot.knownShots ?? []);
  }
}
function updateArcaneArcherVisibility() {
  const block = document.getElementById("arcaneArcherBlock");
  if (!block) return;

  const isArcaneArcher =
    character.class?.id === "fighter" &&
    character.subclass?.id === "arcane-archer";

  block.hidden = !isArcaneArcher;
}
function renderExpertiseToggles() {
  const expertise = character.proficiencies.expertise;

  document.querySelectorAll(".skills label").forEach(label => {
    const checkbox = label.querySelector("input[type='checkbox']");
    if (!checkbox) return;

    const skillId = checkbox.id.replace("skill-", "");
    if (!character.proficiencies.skills.has(skillId)) return;

    let star = label.querySelector(".expertise-toggle");
    if (!star) {
      star = document.createElement("button");
      star.type = "button";
      star.className = "expertise-toggle";
      star.textContent = "⭐";
      star.title = "Toggle Expertise";
      star.style.marginLeft = "6px";
      label.appendChild(star);
    }

    star.classList.toggle("active", expertise.has(skillId));

    star.onclick = () => {
      if (expertise.has(skillId)) {
        expertise.delete(skillId);
      } else {
        expertise.add(skillId);
      }
      renderExpertiseToggles();
    };
  });
}

function renderSoulTrinkets() {
  const panel = document.getElementById("soulTrinketPanel");
  const countEl = document.getElementById("soulTrinketCount");
  const plusBtn = document.getElementById("soulPlus");
  const minusBtn = document.getElementById("soulMinus");

  const trinkets = character.combat?.soulTrinkets;
  if (!panel || !countEl || !trinkets) {
    if (panel) panel.hidden = true;
    return;
  }

  // ✅ Use existing proficiency bonus function
  trinkets.max = proficiencyBonus(character.class.level);

  // Clamp
  if (trinkets.current > trinkets.max) {
    trinkets.current = trinkets.max;
  }

  panel.hidden = false;
  countEl.textContent = `${trinkets.current} / ${trinkets.max}`;

  plusBtn.disabled = trinkets.current >= trinkets.max;
  minusBtn.disabled = trinkets.current <= 0;

  plusBtn.onclick = () => {
    if (trinkets.current < trinkets.max) {
      trinkets.current++;
      renderSoulTrinkets();
    }
  };

  minusBtn.onclick = () => {
    if (trinkets.current > 0) {
      trinkets.current--;
      renderSoulTrinkets();
    }
  };
}

function renderArcaneShotUseDropdown() {
  ensureArcaneShotState(); 

  const select = document.getElementById("arcaneShotSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— Select Shot —</option>`;

  character.combat.arcaneShot.knownShots.forEach(id => {
    const shot = ALL_ARCANE_SHOTS.find(s => s.id === id);
    if (!shot) return;

    const opt = document.createElement("option");
    opt.value = shot.id;
    opt.textContent = shot.name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    character.combat.arcaneShot.activeShot = select.value || null;
    renderArcaneShotDetails();
  };
}


function renderArcaneShotDetails() {
  const list = document.getElementById("arcaneShotDetailsList");
  if (!list) return;

  list.innerHTML = "";

  // Guard: only show for Arcane Archer with known shots
  if (
    character.class?.id !== "fighter" ||
    character.subclass?.id !== "arcane-archer" ||
    !character.combat?.arcaneShot ||
    !character.combat.arcaneShot.knownShots ||
    character.combat.arcaneShot.knownShots.size === 0
  ) {
    return;
  }

  character.combat.arcaneShot.knownShots.forEach(id => {
    const shot = ALL_ARCANE_SHOTS.find(s => s.id === id);
    if (!shot) return;

    const row = document.createElement("div");
    row.className = "feature";

    row.innerHTML = `
      <strong>${shot.name}</strong>
      <div class="muted">Level ${shot.level}</div>
      <div>${shot.description}</div>
    `;

    list.appendChild(row);
  });
}

function updateSteelDefenderUI() {
  const block = document.getElementById("steelDefenderBlock");
  const select = document.getElementById("steelDefenderInfo");
  const details = document.getElementById("steelDefenderDetails");

  if (
    !block ||
    !select ||
    !details ||
    character.subclass?.id !== "battle-smith"
  ) {
    if (block) block.hidden = true;
    return;
  }

  block.hidden = false;

  const level = character.level
;

  const infoMap = {
    base: `
Steel Defender is a construct companion that acts on your initiative.
It can move and use its reaction every round.
You must use a bonus action to command it to take actions.
`,
    reaction: `
Deflect Attack (Reaction):
Imposes disadvantage on an attack made against a creature within 5 feet of it.
`,
    "arcane-jolt": level >= 9
      ? `
Arcane Jolt:
When you hit with a magic weapon or the Steel Defender hits,
you can deal extra force damage or restore hit points to a creature you can see.
Uses equal to your Intelligence modifier.
`
      : "Arcane Jolt unlocks at level 9.",
    improved: level >= 15
      ? `
Improved Defender:
The Steel Defender deals extra force damage and its reactions improve.
`
      : "Improved Defender unlocks at level 15."
  };

  details.textContent = infoMap[select.value] ?? "";
}

function updateArmorLockText() {
  const note = document.getElementById("arcaneArmorNote");
  if (!note) return;

  note.hidden = !character.combat?.arcaneArmor;
}

function updateArmorerModeUI() {
  const block = document.getElementById("armorerModeBlock");
  if (!block) return;

  const active =
    character.subclass?.id === "armorer" &&
    character.level >= 3 &&
    !!character.combat?.arcaneArmor;

  block.hidden = !active;
}


function updateWeaponLockUI() {
  const weaponsSelect = document.getElementById("weaponsSelect");
  if (!weaponsSelect) return;

  weaponsSelect.disabled = !!character.combat?.arcaneArmor;
}

function renderAllSpellUI() {
  renderSpellcasting();
  renderSpellbook();
  renderAlwaysPreparedSpells();
  renderPreparedSpells();
  renderSpellList();
  renderCantripsKnown();
}

function updateEldritchCannonUI() {
  const block = document.getElementById("eldritchCannonBlock");
  const select = document.getElementById("eldritchCannonSelect");
  const desc = document.getElementById("eldritchCannonDescription");

  if (!block || !select || !desc) return;

  const isArtillerist =
    character.class?.id === "artificer" &&
    character.subclass?.id === "artillerist";

  if (!isArtillerist) {
    block.hidden = true;
    return;
  }

  block.hidden = false;

  const type = character.combat?.eldritchCannonType;
  select.value = type;
  desc.textContent = ELDRITCH_CANNON_DESCRIPTIONS[type] ?? "";
}

function checkInfusionUnlocks(prevLevel, newLevel) {
  const prevMax = getMaxInfusionsKnown(prevLevel);
  const newMax = getMaxInfusionsKnown(newLevel);

  if (newMax > prevMax) {
    character.resolvedChoices.infusions = false;
  }
}

async function loadAllTools() {
  const categories = [
    { key: "artisan", file: "artisan-tools.json" },
    { key: "gaming", file: "gaming-tools.json" },
    { key: "musical", file: "musical-tools.json" },
    { key: "kits", file: "kits-tools.json" }
  ];

  const results = [];

  for (const cat of categories) {
    const res = await fetch(`./data/tools/${cat.file}`);
    const data = await res.json();

    data.forEach(id => {
      results.push({
        id,
        category: cat.key
      });
    });
  }

  ALL_TOOLS = results;
}

function initFighterResources() {
  if (character.class?.id !== "fighter") {
    delete character.combat?.secondWind;
    delete character.combat?.actionSurge;
    delete character.combat?.indomitable;
    return;
  }

  character.combat ??= {};

  // =========================
  // Second Wind (Lv 1)
  // =========================
  character.combat.secondWind ??= { used: false };

  // =========================
  // Action Surge (Lv 2)
  // =========================
  if (character.level >= 2) {
    const maxUses = character.level >= 17 ? 2 : 1;
    character.combat.actionSurge ??= {
      usesMax: maxUses,
      usesUsed: 0
    };
    character.combat.actionSurge.usesMax = maxUses;
  } else {
    delete character.combat.actionSurge;
  }

  // =========================
  // Indomitable (Lv 9)
  // =========================
  if (character.level >= 9) {
    character.combat.indomitable ??= {
      usesMax: character.level >= 13 ? 2 : 1,
      usesUsed: 0
    };
    character.combat.indomitable.usesMax =
      character.level >= 13 ? 2 : 1;
  } else {
    delete character.combat.indomitable;
  }
}

function renderToolDropdown() {
  const container = document.getElementById("toolsList");
  if (!container) return;

  container.innerHTML = "";

  const select = document.createElement("select");
  select.innerHTML = `<option value="">— Add Tool Proficiency —</option>`;

  ALL_TOOLS.forEach(tool => {
    if (character.proficiencies.tools.has(tool.id)) return;

    const opt = document.createElement("option");
    opt.value = tool.id;
    opt.textContent = tool.id.replace(/-/g, " ");
    select.appendChild(opt);
  });

  select.addEventListener("change", e => {
    const toolId = e.target.value;
    if (!toolId) return;

    character.proficiencies.tools.add(toolId);
    renderToolDropdown();
  });

  container.appendChild(select);

  // Render chosen tools
  const list = document.createElement("ul");

  character.proficiencies.tools.forEach(tool => {
    const li = document.createElement("li");
    li.textContent = tool.replace(/-/g, " ");

    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      character.proficiencies.tools.delete(tool);
      renderToolDropdown();
    });

    li.appendChild(remove);
    list.appendChild(li);
  });

  container.appendChild(list);
}

function updateSubclassUI() {
  const nameEl = document.getElementById("subclassName");
  const btn = document.querySelector('.detail-btn[data-type="subclass"]');

  if (!nameEl || !btn) return;

  if (!character.subclass) {
    nameEl.textContent = "—";
    btn.dataset.id = "";
    return;
  }

  nameEl.textContent = character.subclass.name;
  btn.dataset.id = character.subclass.id;
}

function fmtSigned(n) {
  return `${n >= 0 ? "+" : ""}${n}`;
}
function toggleDisadvantageUI(enabled) {
  const affectedStats = ["str", "dex"];

  /* ===== Saving Throws ===== */
  affectedStats.forEach(stat => {
    const checkbox = document.getElementById(`save-${stat}`);
    const label = checkbox?.closest("label");
    if (!label) return;

    let badge = label.querySelector(".disadvantage");

    if (enabled && !badge) {
      badge = document.createElement("span");
      badge.className = "disadvantage";
      badge.textContent = " Disadvantage";
      label.appendChild(badge);
    }

    if (!enabled && badge) {
      badge.remove();
    }
  });



  /* ===== Skills ===== */
  document.querySelectorAll(".skills label").forEach(label => {
    const text = label.textContent.toLowerCase();
    const isStr = text.includes("(str)");
    const isDex = text.includes("(dex)");

    if (!isStr && !isDex) return;

    let badge = label.querySelector(".disadvantage");

    if (enabled && !badge) {
      badge = document.createElement("span");
      badge.className = "disadvantage";
      badge.textContent = " Disadvantage";
      label.appendChild(badge);
    }

    if (!enabled && badge) {
      badge.remove();
    }
  });
}

function formatToolName(tool) {
  return tool.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function updateProfBonusUI() {
  const el = document.getElementById("profBonus");
if (character.level == null) {
  el.textContent = "—";
  return;
}
el.textContent = fmtSigned(proficiencyBonus(character.level));
}

/* =========================
   Globals
========================= */
let races = [];
let appliedRaceAsi = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
let ALL_WEAPONS = [];
let ALL_ARMOR = [];
let allInfusions = [];
let infusionChoices = null;
let backgrounds = [];
let ALL_TOOLS = [];
let activeChoiceFeature = null;
let ALL_ARCANE_SHOTS = [];
let arcaneShotChoices = null;
/* =========================
   Ability Math
========================= */
function getAbilityScore(stat) {
  const base = Number(character.abilities?.[stat] ?? 10);
  const race = Number(appliedRaceAsi?.[stat] ?? 0);
  return base + race;
}
async function openChoiceFeatureModal(feature, sourceClass) {
  activeChoiceFeature = feature;

  const modal = document.getElementById("choiceFeatureModal");
  const backdrop = document.getElementById("choiceFeatureBackdrop");
  const title = document.getElementById("choiceFeatureTitle");
  const hint = document.getElementById("choiceFeatureHint");
  const optionsEl = document.getElementById("choiceFeatureOptions");
  const confirmBtn = document.getElementById("confirmChoiceFeature");

  // Safety guard
  if (!feature || !feature.optionsSource) {
    console.error("Invalid choice feature:", feature);
    return;
  }

  title.textContent = feature.name;
  hint.textContent = "Choose one option.";
  optionsEl.innerHTML = "";
  confirmBtn.disabled = true;

  const res = await fetch(`./data/${feature.optionsSource}.json`);

  if (!res.ok) {
    console.error(
      `Failed to load choice options: ./data/${feature.optionsSource}.json`,
      feature
    );
    return;
  }

  const options = await res.json();


  let selected = null;

  options.forEach(opt => {
    const wrapper = document.createElement("div");
    wrapper.className = "choice-option";

    const label = document.createElement("label");
    label.className = "choice-label";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "choiceFeature";
    input.value = opt.id;

    input.addEventListener("change", () => {
      selected = opt;
      confirmBtn.disabled = false;
    });

    const text = document.createElement("div");
    text.className = "choice-text";

    const name = document.createElement("div");
    name.className = "choice-name";
    name.textContent = opt.name;

    const desc = document.createElement("div");
    desc.className = "choice-description";
    desc.textContent = opt.description;

    text.appendChild(name);
    text.appendChild(desc);

    label.appendChild(input);
    label.appendChild(text);
    wrapper.appendChild(label);
    optionsEl.appendChild(wrapper);
  });

  confirmBtn.onclick = () => {
    if (!selected) return;

    character.features.push({
      id: selected.id,
      name: selected.name,
      description: selected.description,
      source: sourceClass,
      parentFeature: feature.id
    });

    character.resolvedChoices.choiceFeature ??= {};
    character.resolvedChoices.choiceFeature[feature.id] = true;

    delete character.pendingChoices.choiceFeature;
    closeChoiceFeatureModal();
    renderFeatures();
  };


  modal.hidden = false;
  backdrop.hidden = false;
}


function closeChoiceFeatureModal() {
  document.getElementById("choiceFeatureModal").hidden = true;
  document.getElementById("choiceFeatureBackdrop").hidden = true;
  activeChoiceFeature = null;
}

function recalcAllAbilities() {
  ["str", "dex", "con", "int", "wis", "cha"].forEach(stat => {
    const el = document.getElementById(stat + "Mod");
    if (!el) return;
    el.textContent = `(${fmtSigned(abilityMod(getAbilityScore(stat)))})`;
  });
}

function updateRaceBonusDisplay() {
  ["str", "dex", "con", "int", "wis", "cha"].forEach(stat => {
    const el = document.getElementById(stat + "RaceBonus");
    if (!el) return;
    const bonus = appliedRaceAsi[stat] || 0;
    el.textContent = bonus === 0 ? "+0" : `+${bonus}`;
  });
}

/* =========================
   Skills
========================= */
function renderSkills() {
  character.proficiencies ??= {};
  character.proficiencies.skills ??= new Set();
const stealthCheckbox = document.getElementById("skill-stealth");
const stealthLabel = stealthCheckbox?.closest("label");

if (stealthLabel) {
  // Remove existing ADV indicator if present
  stealthLabel.querySelector(".advantage")?.remove();

  if (character.combat?.stealthAdvantage) {
    const adv = document.createElement("span");
    adv.className = "advantage";
    adv.textContent = "Advantage";
    stealthLabel.appendChild(adv);
  }
}


  document
    .querySelectorAll(".skills input[type=checkbox]")
    .forEach(cb => {
      const key = cb.id.replace("skill-", "");
      cb.checked = character.proficiencies.skills.has(key);

      // ✅ RE-ENABLE after choice is made
      cb.disabled = false;
    });
}


/* =========================
   Saving Throws
========================= */
function renderSavingThrows() {
  const saves = character.savingThrows || {};
  ["str","dex","con","int","wis","cha"].forEach(stat => {
    const cb = document.getElementById(`save-${stat}`);
    if (!cb) return;
    cb.checked = !!saves[stat];
  });
}

/* =========================
   Router: "+" detail buttons
========================= */
function syncDetailButtons() {
  const classBtn = document.querySelector('.detail-btn[data-type="class"]');
  const raceBtn = document.querySelector('.detail-btn[data-type="race"]');
  const subBtn  = document.querySelector('.detail-btn[data-type="subclass"]');

  const classSelect = document.getElementById("classSelect");
  const raceSelect  = document.getElementById("raceSelect");

  if (classBtn && classSelect) classBtn.dataset.id = classSelect.value || "";
  if (raceBtn && raceSelect)   raceBtn.dataset.id = raceSelect.value || "";
  if (subBtn) subBtn.dataset.id = character.subclass?.id || "";
}

document.addEventListener("click", e => {
  if (e.target.closest(".spellcasting-panel")) return;

  const btn = e.target.closest(".detail-btn");
  if (!btn) return;

  // 🔑 Ensure ID is correct at click time
  if (btn.dataset.type === "class") {
    btn.dataset.id = document.getElementById("classSelect")?.value || "";
  }

  if (btn.dataset.type === "race") {
    btn.dataset.id = document.getElementById("raceSelect")?.value || "";
  }

  if (btn.dataset.type === "subclass") {
    btn.dataset.id = character.subclass?.id || "";
  }

  openDetail(btn.dataset.type, btn.dataset.id);
});



/* =========================
   Races
========================= */
async function initRaces() {
  const res = await fetch("./data/races.all.json");
  const data = await res.json();

  races = data.map((r, i) => ({
    id: i,
    name: r.title,
    source: r.tags.find(t => t !== "race"),
    contents: r.contents
  }));
}
/* =========================
   Backgrounds
========================= */
async function initBackgrounds() {
  const res = await fetch("./data/backgrounds.json");
  const data = await res.json();

  backgrounds = data.map((b, i) => ({
    id: i,
    title: b.title,
    contents: b.contents
  }));
}


function renderBackgroundDetails(bg) {
  const el = document.getElementById("backgroundDetails");
  if (!el) return;

  el.innerHTML = "";

  bg.contents.forEach(line => {
    const div = document.createElement("div");
    div.textContent = line;
    el.appendChild(div);
  });
}

function populateRaceDropdown() {
  const select = document.getElementById("raceSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— Select Race —</option>`;
  races.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = `${r.name} (${r.source})`;
    select.appendChild(opt);
  });
}

function renderRaceDetails(race) {
  const el = document.getElementById("raceDetails");
  if (!el) return;

  el.innerHTML = "";
  race.contents.forEach(line => {
    const div = document.createElement("div");
    div.textContent = line;
    el.appendChild(div);
  });
}

function applyRaceToCharacter(race) {
  appliedRaceAsi = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  character.combat.baseSpeed = 30;

  race.contents.forEach(line => {
    if (!line.startsWith("property")) return;
    const [, label, value] = line.split("|").map(s => s.trim());

    if (label === "Ability Scores" && !value.includes("choose")) {
      value.split(";").forEach(p => {
        const [stat, amt] = p.trim().split(" ");
        appliedRaceAsi[stat.slice(0, 3).toLowerCase()] = Number(amt);
      });
    }

    if (label === "Speed") {
  // Walking speed
  const walkMatch = value.match(/(\d+)\s*ft/);
  if (walkMatch) {
    character.combat.baseSpeed = Number(walkMatch[1]);
  }

  // Flying speed (optional)
  const flyMatch = value.match(/fly\s*(\d+)/i);
  if (flyMatch) {
    character.combat.baseFlySpeed = Number(flyMatch[1]);
  }
}

  });

  const speedInput = document.getElementById("speed");
  if (speedInput) speedInput.value = character.combat.baseSpeed;
}

function runPendingChoiceFlow() {
  if (character.pendingChoices?.skills) {
    renderSkillChoice(character);
    return;
  }

  if (character.pendingSubclassChoice && !character.subclass) {
    openSubclassModal(character.pendingSubclassChoice);
    return;
  }

  if (character.pendingChoices?.spells) {
    renderSpellbook();
    return;
  }

  if (character.pendingChoices?.choiceFeature) {
    const { feature, source } = character.pendingChoices.choiceFeature;
    openChoiceFeatureModal(feature, source);
    return;
  }

  if (character.pendingChoices?.tools) {
    openToolChoiceModal();
    return;
  }

  if (character.pendingChoices?.arcaneShots) {
    initArcaneShotKnownUI();
    return;
  }
}

/* =========================
   Tool Choice Modal
========================= */
async function openToolChoiceModal() {
  const modal = document.getElementById("toolChoiceModal");
  const backdrop = document.getElementById("toolChoiceBackdrop");
  const optionsDiv = document.getElementById("toolChoiceOptions");
  const confirmBtn = document.getElementById("confirmTool");

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) return;

  const res = await fetch("./data/tools/artisan-tools.json");
  const tools = await res.json();

  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;
  modal.hidden = false;
  backdrop.hidden = false;

  let selected = null;

  tools.forEach(tool => {
    const label = document.createElement("label");
    label.style.display = "block";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "artisanTool";
    radio.value = tool;

    radio.onchange = () => {
      selected = tool;
      confirmBtn.disabled = false;
    };

    label.appendChild(radio);
    label.append(` ${formatToolName(tool)}`);
    optionsDiv.appendChild(label);
  });

  confirmBtn.onclick = () => {
    if (!selected) return;
    character.proficiencies.tools.add(selected);
    character.pendingChoices.tools = null;
    character.resolvedChoices.tools = true;
    modal.hidden = true;
    backdrop.hidden = true;
    window.dispatchEvent(new Event("tools-updated"));
    runPendingChoiceFlow();
  };
}

/* =========================
   Subclass Modal
========================= */
async function openSubclassModal(pending) {
  const modal = document.getElementById("subclassModal");
  const backdrop = document.getElementById("subclassBackdrop");
  const optionsDiv = document.getElementById("subclassOptions");
  const confirmBtn = document.getElementById("confirmSubclass");
  const title = document.getElementById("subclassTitle");
if (title && pending.label) {
  title.textContent = `Choose ${pending.label}`;
}

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) return;

  const res = await fetch(`./data/${pending.source}/index.json`);
  if (!res.ok) {
    console.error("Failed to load subclass index:", pending.source);
    return;
}

  const subclasses = await res.json();

  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;
  modal.hidden = false;
  backdrop.hidden = false;

  let selected = null;

  subclasses.forEach(sc => {
    const btn = document.createElement("button");
    btn.textContent = sc.name;
    btn.onclick = () => {
      selected = sc;
      confirmBtn.disabled = false;
    };
    optionsDiv.appendChild(btn);
  });

  confirmBtn.onclick = async () => {
    if (!selected) return;
    const res = await fetch(`./data/${pending.source}/${selected.id}.json`);
  if (!res.ok) {
    console.error("Failed to load subclass:", selected.id);
    return;
  }

    const data = await res.json();
    applySubclass(character, data);

    modal.hidden = true;
    backdrop.hidden = true;

    window.dispatchEvent(new Event("subclass-updated"));
  };
}

/* =========================
   Combat & Attacks
========================= */
async function updateCombat() {
  // Reset UI indicators first
  toggleDisadvantageUI(false);

  const acEl = document.getElementById("armorClass");
  const initEl = document.getElementById("initiative");
  const warningEl = document.getElementById("armorWarning");
  const strengthWarning = document.getElementById("strengthWarning");
  const spellPanel = document.querySelector(".spellcasting-panel");

  if (!acEl || !initEl) return;

  let ac = await calculateArmorClass(character);

  if (character.combat?.infusedArmor) {
    ac += 1;
  }

  character.combat.armorClass = ac;
  acEl.textContent = ac;


  // 🔁 Arcane Armor overrides all penalties
  if (character.combat?.arcaneArmor) {
    character.combat.armorPenalty = false;
    character.combat.strPenalty = false;
  }

  // Initiative
  const dex = abilityMod(getAbilityScore("dex"));
  initEl.textContent = fmtSigned(dex);

  // ⚠️ Armor proficiency warning
  if (warningEl) {
    warningEl.hidden =
      !character.combat?.armorPenalty || character.combat?.arcaneArmor;
  }

  // 💪 Strength requirement warning
  if (strengthWarning) {
    strengthWarning.hidden =
      !character.combat?.strPenalty || character.combat?.arcaneArmor;
  }

// 🏃 Speed calculation
let speed = character.combat?.baseSpeed ?? 30;

// Strength penalty (ignored by Arcane Armor)
if (character.combat?.strPenalty) {
  speed -= 10;
}

// 🕶️ Infiltrator bonus
if (
  character.combat?.arcaneArmor &&
  character.combat?.armorerMode === "infiltrator"
) {
  speed += 5;
}
// 🕶️ Infiltrator stealth advantage
if (
  character.combat?.arcaneArmor &&
  character.combat?.armorerMode === "infiltrator"
) {
  character.combat.stealthAdvantage = true;
} else {
  delete character.combat.stealthAdvantage;
}

character.combat.speed = speed;

const speedInput = document.getElementById("speed");
if (speedInput) {
  speedInput.value = speed;
  speedInput.disabled = !!character.combat?.arcaneArmor;
}

  // 🚫 Disable spellcasting
  if (spellPanel) {
    spellPanel.classList.toggle(
      "spellcasting-disabled",
      !!character.combat?.armorPenalty && !character.combat?.arcaneArmor
    );
  }

  // ❗ Disadvantage indicators
  toggleDisadvantageUI(
    !character.combat?.arcaneArmor &&
      (character.combat?.armorPenalty || character.combat?.strPenalty)
  );

  // 🔒 Lock armor UI if Arcane Armor is active
  updateArmorLockUI();
  updateArmorLockText();
  // 🕊️ Flying speed (if applicable)
if (character.combat?.baseFlySpeed) {
  let flySpeed = character.combat.baseFlySpeed;

  character.combat.flySpeed = flySpeed;
} else {
  delete character.combat.flySpeed;
}
const flyBlock = document.getElementById("flySpeedBlock");
const flyInput = document.getElementById("flySpeed");

if (flyBlock && flyInput) {
  if (character.combat?.flySpeed) {
    flyBlock.hidden = false;
    flyInput.value = character.combat.flySpeed;
  } else {
    flyBlock.hidden = true;
  }
}

}

function getWeaponAbilityMod(weapon) {
  const props = weapon.properties || [];
  const category = weapon.category?.toLowerCase() || "";

  if (category.includes("ranged")) return abilityMod(getAbilityScore("dex"));

  if (props.some(p => String(p).toLowerCase().includes("finesse"))) {
    return Math.max(
      abilityMod(getAbilityScore("str")),
      abilityMod(getAbilityScore("dex"))
    );
  }

  return abilityMod(getAbilityScore("str"));
}

function renderAttacks() {
  const tbody = document.querySelector("#attacksTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const level = Number(character.level ?? 1);
  const prof = proficiencyBonus(level);

  /* =========================
     ARMORER: GUARDIAN
  ========================= */
  if (
    character.combat?.arcaneArmor &&
    character.combat?.armorerMode === "guardian"
  ) {
    const intMod = abilityMod(character.abilities?.int ?? 10);
    const attackBonus = intMod + prof;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>Thunder Gauntlets</td>
      <td>${fmtSigned(attackBonus)}</td>
      <td>1d8 ${fmtSigned(intMod)}</td>
      <td>Thunder</td>
      <td>On hit: target has disadvantage on attacks vs others</td>
    `;
    tbody.appendChild(row);

    return; // 🔑 STOP here
  }

  /* =========================
     ARMORER: INFILTRATOR
  ========================= */
  if (
    character.combat?.arcaneArmor &&
    character.combat?.armorerMode === "infiltrator"
  ) {
    const intMod = abilityMod(character.abilities?.int ?? 10);
    const attackBonus = intMod + prof;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>Lightning Launcher</td>
      <td>${fmtSigned(attackBonus)}</td>
      <td>1d6 ${fmtSigned(intMod)}</td>
      <td>Lightning</td>
      <td>Once/turn +1d6 lightning damage</td>
    `;
    tbody.appendChild(row);

    return; // 🔑 STOP here
  }

  /* =========================
     NORMAL WEAPONS
  ========================= */
(character.weapons || []).forEach(id => {
  const weapon = ALL_WEAPONS.find(w => w.id === id);
  if (!weapon) return;

  const abilityBonus = getWeaponAbilityMod(weapon);
  const infusionBonus =
    character.combat?.infusedWeapon === weapon.id ? 1 : 0;


  const attackBonus = abilityBonus + prof + infusionBonus;
  const damageDice = weapon.damage?.[0]?.dice || "—";
  const damageType = weapon.damage?.[0]?.type || "—";

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${weapon.name}</td>
    <td>${fmtSigned(attackBonus)}</td>
    <td>${damageDice} ${fmtSigned(abilityBonus + infusionBonus)}</td>
    <td>${damageType}</td>
    <td>${(weapon.properties || []).join(", ") || "—"}</td>
  `;
  tbody.appendChild(row);
});
}


/* =========================
   Hit Points (Snapshot)
========================= */
function updateHitPoints() {
  const maxHpEl = document.getElementById("maxHp");
  const totalHitDiceEl = document.getElementById("totalHitDice");
  const hitDieInput = document.getElementById("hitDie");
  if (!maxHpEl || !totalHitDiceEl || !hitDieInput) return;

  const level = character.level || 1;
  const conMod = abilityMod(getAbilityScore("con"));
  const hitDie = character.hp?.hitDie || Number(hitDieInput.value) || 8;
  const avgPerLevel = Math.floor(hitDie / 2) + 1;

  const maxHp = hitDie + conMod + (level - 1) * (avgPerLevel + conMod);

  maxHpEl.textContent = Math.max(1, maxHp);
  totalHitDiceEl.textContent = level;
}

/* =========================
   Ability input listeners
========================= */
["str","dex","con","int","wis","cha"].forEach(stat => {
  const input = document.getElementById(stat);
  if (!input) return;

  input.addEventListener("input", async () => {
    character.abilities[stat] = Number(input.value || 10);
    recalcAllAbilities();
    await updateCombat();
    renderAttacks();
    updateHitPoints();
  });
});

/* =========================
   Init
========================= */
window.addEventListener("DOMContentLoaded", async () => {
  initWeaponAndSpellSelects();

  document
    .querySelectorAll(".skills input[type=checkbox]")
    .forEach(cb => (cb.disabled = true));
  document
    .querySelectorAll(".saves input[type=checkbox]")
    .forEach(cb => (cb.disabled = true));

  await initBackgrounds();
  populateBackgroundDropdown();
  await initRaces();
  populateRaceDropdown();
  syncDetailButtons();

/* ===== Armor ===== */
const armorRes = await fetch("./data/armor.json");
ALL_ARMOR = await armorRes.json();

const armorSelect = document.getElementById("armorSelect");
if (armorSelect) {
  ALL_ARMOR
    .filter(a => a.category !== "shield")
    .forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      armorSelect.appendChild(opt);
    });
}

/* ===== Infusions ===== */
fetch("./data/infusions/artificer.json")
  .then(r => r.json())
  .then(d => {
    allInfusions = d;
    renderInfusions();
  });

/* ===== Armor Controls ===== */
document.getElementById("armorSelect")?.addEventListener("change", async e => {
  character.equipment.armor = e.target.value || null;
  await updateCombat();
  applyInfusionEffects();
  renderAttacks(); 
});


document.getElementById("shieldToggle")?.addEventListener("change", async e => {
  character.equipment.shield = e.target.checked;
  await updateCombat();
  applyInfusionEffects();
  renderAttacks();
});


  document.getElementById("raceSelect")?.addEventListener("change", async e => {
    const race = races.find(r => r.id == e.target.value);
    if (!race) return;

    applyRaceToCharacter(race);
    renderRaceDetails(race);
    updateRaceBonusDisplay();
    recalcAllAbilities();
    await updateCombat();
    applyInfusionEffects();
    renderAttacks();
    updateFighterUI();
    updateHitPoints();
    updateProfBonusUI();
    syncDetailButtons();
  });

  document.getElementById("classSelect")?.addEventListener("change", async e => {
    if (!e.target.value) return;

    const level = Number(document.getElementById("level")?.value || 1);
    character.level = level;
    const prevInfusions = {
    known: new Set(character.infusions?.known ?? []),
    active: new Set(character.infusions?.active ?? [])
  };

    const classData = await loadClass(e.target.value);
    await applyClass(character, classData, level);
    character.infusions ??= { known: new Set(), active: new Set() };

    // Restore known
    character.infusions.known = prevInfusions.known;

    // Restore active (only if still known)
    character.infusions.active = new Set(
      [...prevInfusions.active].filter(id =>
        character.infusions.known.has(id)
      )
    );

    // 🔁 RE-APPLY subclass if already chosen (level changes, reloads, etc.)
    if (character._subclassData) {
      applySubclass(character, character._subclassData);
    }

    // 🔥 THIS WAS MISSING 🔥
    renderSavingThrows();
    renderFeatures();
    updateSpellcastingVisibility();
    await initSpellSlots();
    updateInfusionsVisibility(classData);
    renderSkills();
    renderExpertiseToggles();
    initFighterResources();
    renderInfusions();
    renderAllSpellUI();   // spellcasting + lists
    renderSpellSlots();
    updateHitPoints();
    updateProfBonusUI();
    await updateCombat();
    renderAttacks();
    updateFighterUI();
    syncDetailButtons();
    updateArmorLockUI();
    updateArmorLockText();
    updateArmorerModeUI();
    updateWeaponLockUI();
    runPendingChoiceFlow();
    updateArcaneArcherVisibility();
    renderSoulTrinkets();

  });


  document.getElementById("level")?.addEventListener("change", async e => {
  if (!character.class?.id) return;

  const prevLevel = Number(character.level ?? 1);
  const lvl = Number(e.target.value);

  // update single source of truth
  character.level = lvl;
  checkArcaneShotUnlocks(prevLevel, lvl);
  const indomitableBtn = document.getElementById("indomitableBtn");
  const indomitableStatus = document.getElementById("indomitableStatus");

  if (indomitableBtn) {
    indomitableBtn.onclick = () => {
      const i = character.combat.indomitable;
      if (!i || i.usesUsed >= i.usesMax) return;

      i.usesUsed++;
      updateFighterButtons();
    };
  }


  // snapshot infusion state (because applyClass may touch pendingChoices)
  const prevInfusions = {
    known: new Set(character.infusions?.known ?? []),
    active: new Set(character.infusions?.active ?? []),
    targets: { ...(character.infusions?.targets ?? {}) }
  };

  // Re-apply class up to the new level (adds new features, sets pendingSubclassChoice, etc.)
  const classData = await loadClass(character.class.id);
  await applyClass(character, classData, lvl);

  // Re-apply subclass (adds any new subclass features / always-prepared spells for this level)
  if (character._subclassData) {
    applySubclass(character, character._subclassData);
  }

  // restore infusion state
  character.infusions.known = prevInfusions.known;
  character.infusions.active = new Set(
    [...prevInfusions.active].filter(id => character.infusions.known.has(id))
  );
  character.infusions.targets = prevInfusions.targets;

  // If max known increased at 6/10/14, force re-selection
  checkInfusionUnlocks(prevLevel, lvl);

  // UI refresh
  renderSavingThrows();
  renderFeatures();
  renderSkills();
  renderExpertiseToggles();
  await initSpellSlots();
  renderAllSpellUI();
  renderSpellSlots();
  initFighterResources();
  renderInfusions();
  updateHitPoints();
  updateProfBonusUI();
  await loadAllTools();
  renderToolDropdown();
  await updateCombat();
  applyInfusionEffects();
  renderAttacks();
  updateFighterUI();
  syncDetailButtons();
  updateArmorLockUI();
  updateArmorLockText();
  updateArmorerModeUI();
  updateWeaponLockUI();
  renderSoulTrinkets();


  // This is what opens subclass/tool/skill/infusion modals
  runPendingChoiceFlow();
  initArcaneShotKnownUI();
  renderArcaneShotDetails();
  renderArcaneShotUseDropdown();
});


  /* ===== Event wiring ===== */
  window.addEventListener("weapons-changed", renderAttacks)
  window.addEventListener("skills-updated", () => {
    renderSkills();       
    renderExpertiseToggles();
    renderFeatures();     
    runPendingChoiceFlow(); 
  });

window.addEventListener("features-updated", () => {
  renderFeatures();
  renderSavingThrows();
});
window.addEventListener("features-updated", updateSteelDefenderUI);
document
  .getElementById("steelDefenderInfo")
  ?.addEventListener("change", updateSteelDefenderUI);

window.addEventListener("combat-updated", async () => {
  await updateCombat();
  applyInfusionEffects();
  renderAttacks(); // 🔑 REQUIRED
  updateEldritchCannonUI();
  renderSoulTrinkets();
});
window.addEventListener("combat-updated", () => {
  if (character.class?.id === "fighter") {
    updateFighterButtons();
  }
});
window.addEventListener("spellbook-updated", () => {
  renderPreparedSpells();
  renderSpellList(); // optional but recommended
});

window.addEventListener("subclass-updated", async () => {
  syncDetailButtons();
  updateSubclassUI();
  updateArmorLockUI();
  updateFighterUI();
  await initSpellSlots();
  renderSpellSlots();
  updateArmorLockText();
  updateArmorerModeUI();
  await loadAllTools();
  renderToolDropdown();
  await updateCombat();
  applyInfusionEffects();
  renderAttacks();        
  updateWeaponLockUI();
  runPendingChoiceFlow();
  initArcaneShotKnownUI();
  updateArcaneArcherVisibility();
  renderArcaneShotUseDropdown();
  renderArcaneShotDetails();
  updateArcaneShotActiveUI();
  renderSoulTrinkets();
});

document
  .getElementById("armorerModeSelect")
  ?.addEventListener("change", async e => {
    character.combat.armorerMode = e.target.value;
    await updateCombat();
    renderSkills();         
    renderFeatures();
    renderAttacks();
  });

document.getElementById("secondWindBtn").onclick = () => {
  const sw = character.combat.secondWind;
  if (sw.used) return;

  sw.used = true;

  const heal = Math.floor(Math.random() * 10) + 1 +
               Math.floor((character.abilities.con - 10) / 2);

  alert(`Second Wind: regain ${heal} HP`);

  window.dispatchEvent(new Event("combat-updated"));
};
document.getElementById("actionSurgeBtn").onclick = () => {
  const as = character.combat.actionSurge;
  if (as.usesUsed >= as.usesMax) return;

  as.usesUsed += 1;

  alert("Action Surge used: gain one additional action");

  window.dispatchEvent(new Event("combat-updated"));
};

document
  .getElementById("backgroundSelect")
  ?.addEventListener("change", e => {
    const bg = backgrounds.find(b => b.id == e.target.value);
    if (!bg) return;

    applyBackground(bg);
    renderBackgroundDetails(bg);
    renderSkills();
    renderExpertiseToggles();
    renderFeatures();
    runPendingChoiceFlow(); // opens language modal
    syncDetailButtons();
  });

window.addEventListener("rest-long", renderSpellSlots);
  document.getElementById("shortRestBtn").onclick = applyShortRest;
  document.getElementById("longRestBtn").onclick = applyLongRest;

  /* ===== Weapons ===== */
  fetch("./data/weapons.all.json")
    .then(r => r.json())
    .then(d => {
      ALL_WEAPONS = d;
      renderAttacks();
    });
  /* ===== Equipment UI Sync ===== */
  const armorSelectInit = document.getElementById("armorSelect");
  if (armorSelectInit && character.equipment?.armor) {
    armorSelectInit.value = character.equipment.armor;
  }

  const shieldToggleInit = document.getElementById("shieldToggle");
  if (shieldToggleInit) {
    shieldToggleInit.checked = !!character.equipment?.shield;
  }
document
  .getElementById("eldritchCannonSelect")
  ?.addEventListener("change", e => {
    character.combat.eldritchCannonType = e.target.value;
    updateEldritchCannonUI();
  });
/* ===== Initial Render ===== */
// 🔥 HARD RESET SPELLCASTING IF NO CLASS SELECTED
if (!character.class?.id || !character.spellcasting?.enabled) {
  character.spellcasting.enabled = false;
}


recalcAllAbilities();
updateRaceBonusDisplay();

// 🔑 SPELL SLOTS — GUARDED
if (character.class?.id && character.spellcasting?.enabled) {
  await initSpellSlots();
  renderSpellSlots();
} else {
  const slotsEl = document.getElementById("spellSlots");
  if (slotsEl) slotsEl.innerHTML = "";
}

await updateCombat();
applyInfusionEffects(); 
renderAttacks();        
updateFighterUI();
initLanguageSelect();
syncLanguagesUI();
updateArmorLockUI();
initFighterResources();
await loadAllTools();
renderToolDropdown();
renderSkills();
renderExpertiseToggles();
runPendingChoiceFlow();
updateHitPoints();
updateProfBonusUI();
renderSavingThrows();
updateArmorLockText();
syncDetailButtons();
updateArmorerModeUI();
updateWeaponLockUI();
initArcaneShotKnownUI();
renderArcaneShotDetails();
renderArcaneShotUseDropdown();
updateArcaneArcherVisibility();
renderSoulTrinkets();


// HARD RESET ALL BACKDROPS — prevents invisible click shields
[
  "modalBackdrop",
  "toolChoiceBackdrop",
  "subclassBackdrop",
  "infusionBackdrop",
  "choiceFeatureBackdrop",
  "languageChoiceBackdrop",
  "spellDetailBackdrop"
].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.hidden = true;
    el.style.display = "none";
    el.style.pointerEvents = "none";
  }
  // 🔓 DEBUG EXPORTS (temporary)
window.getMaxArcaneShotsKnown = getMaxArcaneShotsKnown;
window.checkArcaneShotUnlocks = checkArcaneShotUnlocks;
window.ensureArcaneShotState = ensureArcaneShotState;

});
});