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
import { parseBackgroundCard } from "./engine/backgroundParser.js";
import { applyBackground } from "./engine/applyBackground.js";

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

function renderLanguages() {
  const el = document.getElementById("languagesList");
  if (!el) return;

  el.textContent =
    character.proficiencies.languages.size
      ? [...character.proficiencies.languages].join(", ")
      : "—";
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

    const TOOL_CATEGORY_MAP = {
      artisan: "./data/tools/artisan.json",
      gaming: "./data/tools/gaming.json",
      musical: "./data/tools/musical.json"
    };
async function runToolCategoryChoice(choice) {
  const modal = document.getElementById("toolChoiceModal");
  const backdrop = document.getElementById("toolChoiceBackdrop");
  const optionsEl = document.getElementById("toolChoiceOptions");
  const confirmBtn = document.getElementById("confirmTool");

  optionsEl.innerHTML = "";
  confirmBtn.disabled = true;

  const src = TOOL_CATEGORY_MAP[choice.category];
  if (!src) return;

  const res = await fetch(src);
  const tools = await res.json();

  let selected = new Set();

  tools.forEach(toolId => {
    const label = document.createElement("label");
    label.style.display = "block";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = toolId;

    cb.addEventListener("change", () => {
      if (cb.checked) {
        selected.add(toolId);
      } else {
        selected.delete(toolId);
      }

      // enforce choose limit
      if (selected.size > choice.choose) {
        cb.checked = false;
        selected.delete(toolId);
      }

      confirmBtn.disabled = selected.size !== choice.choose;
    });

    label.append(cb, " ", toolId.replace(/-/g, " "));
    optionsEl.appendChild(label);
  });

  confirmBtn.onclick = () => {
    selected.forEach(tool => {
      character.proficiencies.tools.add(tool);
    });

    character.pendingChoices.tools = null;

    modal.hidden = true;
    backdrop.hidden = true;

    renderTools();
  };

  modal.hidden = false;
  backdrop.hidden = false;
}
async function openLanguageChoiceModal(choice) {
  const modal = document.getElementById("languageChoiceModal");
  const backdrop = document.getElementById("languageChoiceBackdrop");
  const optionsEl = document.getElementById("languageChoiceOptions");
  const confirmBtn = document.getElementById("confirmLanguage");

  optionsEl.innerHTML = "";
  confirmBtn.disabled = true;

  const res = await fetch("./data/languages.json");
  const languages = await res.json();

  let selected = new Set();

  languages.forEach(lang => {
    const label = document.createElement("label");
    label.style.display = "block";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = lang;

    // Disable already-known languages (race/background/etc)
    if (character.proficiencies.languages.has(lang)) {
      cb.disabled = true;
    }

    cb.addEventListener("change", () => {
      if (cb.checked) {
        selected.add(lang);
      } else {
        selected.delete(lang);
      }

      if (selected.size > choice.choose) {
        cb.checked = false;
        selected.delete(lang);
      }

      confirmBtn.disabled = selected.size !== choice.choose;
    });

    label.append(cb, " ", lang.replace(/-/g, " "));
    optionsEl.appendChild(label);
  });

  confirmBtn.onclick = () => {
    selected.forEach(lang => {
      character.proficiencies.languages.add(lang);
    });

    character.pendingChoices.languages = null;

    modal.hidden = true;
    backdrop.hidden = true;

    renderLanguages?.();
  };

  modal.hidden = false;
  backdrop.hidden = false;
}

function populateBackgroundDropdown() {
  const select = document.getElementById("backgroundSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— Select Background —</option>`;

  backgrounds.forEach((bg, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = bg.title;
    select.appendChild(opt);
  });
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


function updateInfusionVisibility() {
  const infusionPanel = document
    .getElementById("infusionsSelect")
    ?.closest(".panel");

  if (!infusionPanel) return;

  infusionPanel.hidden = character.class?.id !== "artificer";
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

function renderVehicles() {
  const el = document.getElementById("vehiclesList");
  if (!el) return;

  el.textContent =
    character.proficiencies.vehicles.size
      ? [...character.proficiencies.vehicles].join(", ")
      : "—";
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
  renderAlwaysPreparedSpells();
  renderPreparedSpells();
  renderSpellList();
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

/* =========================
   Ability Math
========================= */
function getAbilityScore(stat) {
  const base = Number(character.abilities?.[stat] ?? 10);
  const race = Number(appliedRaceAsi?.[stat] ?? 0);
  return base + race;
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
   Tools
========================= */
function renderTools() {
  const el = document.getElementById("toolsList");
  if (!el) return;

  el.textContent =
    character.proficiencies?.tools?.size
      ? [...character.proficiencies.tools].map(formatToolName).join(", ")
      : "—";
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
async function initBackgrounds() {
  const res = await fetch("./data/backgrounds.json");
  const data = await res.json();

  backgrounds = data.filter(card =>
    card.tags?.includes("background")
  );
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

/* =========================
   Pending Choice Flow
========================= */
function runPendingChoiceFlow() {
  if (character.pendingChoices?.skills) {
    renderSkillChoice(character);
    return;
  }

  if (character.pendingChoices?.tools?.category) {
    runToolCategoryChoice(character.pendingChoices.tools);
    return;
  }
if (character.pendingChoices?.languages) {
  openLanguageChoiceModal(character.pendingChoices.languages);
  return;
}



  if (character.pendingSubclassChoice && !character.subclass) {
    openSubclassModal(character.pendingSubclassChoice);
  }
}

/* =========================
   Subclass Modal
========================= */
async function openSubclassModal(pending) {
  const modal = document.getElementById("subclassModal");
  const backdrop = document.getElementById("subclassBackdrop");
  const optionsDiv = document.getElementById("subclassOptions");
  const confirmBtn = document.getElementById("confirmSubclass");

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) return;

  const res = await fetch(`./data/${pending.source}/index.json`);
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

  await initRaces();
  await initBackgrounds();
  populateBackgroundDropdown();
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
    applyClass(character, classData, level);
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
    renderSkills();
    renderInfusions();
    renderTools();
    renderAllSpellUI();   // spellcasting + lists
    updateHitPoints();
    updateInfusionVisibility();
    updateProfBonusUI();
    await updateCombat();
    renderAttacks();
    syncDetailButtons();
    updateArmorLockUI();
    updateArmorLockText();
    updateArmorerModeUI();
    updateWeaponLockUI();
    runPendingChoiceFlow();
  });

  document.getElementById("backgroundSelect")?.addEventListener("change", e => {
      const bg = backgrounds[e.target.value];
      if (!bg) return;
      character.resolvedChoices.background = false;
      character.pendingChoices.languages = null;
      character.pendingChoices.tools = null;

      const parsed = parseBackgroundCard(bg);
      applyBackground(character, parsed);

      // 🔁 Re-render using existing systems
      renderSkills();
      renderTools();
      renderFeatures();
      runPendingChoiceFlow();
    });

  document.getElementById("level")?.addEventListener("change", async e => {
  if (!character.class?.id) return;

  const prevLevel = Number(character.level ?? 1);
  const lvl = Number(e.target.value);

  // update single source of truth
  character.level = lvl;

  // snapshot infusion state (because applyClass may touch pendingChoices)
  const prevInfusions = {
    known: new Set(character.infusions?.known ?? []),
    active: new Set(character.infusions?.active ?? []),
    targets: { ...(character.infusions?.targets ?? {}) }
  };

  // Re-apply class up to the new level (adds new features, sets pendingSubclassChoice, etc.)
  const classData = await loadClass(character.class.id);
  applyClass(character, classData, lvl);

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
  renderTools();
  renderAllSpellUI();
  renderInfusions();
  updateHitPoints();
  updateProfBonusUI();

  await updateCombat();
  applyInfusionEffects();
  renderAttacks();

  syncDetailButtons();
  updateArmorLockUI();
  updateArmorLockText();
  updateArmorerModeUI();
  updateWeaponLockUI();

  // This is what opens subclass/tool/skill/infusion modals
  runPendingChoiceFlow();
});


  /* ===== Event wiring ===== */
  window.addEventListener("weapons-changed", renderAttacks);
  window.addEventListener("tools-updated", renderTools);
  window.addEventListener("skills-updated", () => {
    renderSkills();        
    renderFeatures();     
    runPendingChoiceFlow(); 
  });

window.addEventListener("features-updated", () => {
  renderFeatures();
  renderSavingThrows();
  renderTools();
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
});


window.addEventListener("subclass-updated", async () => {
  syncDetailButtons();
  updateArmorLockUI();
  updateArmorLockText();
  updateArmorerModeUI();
  await updateCombat();
  applyInfusionEffects();
  renderAttacks();        
  updateWeaponLockUI();
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
  recalcAllAbilities();
  updateRaceBonusDisplay();
  await updateCombat();
  applyInfusionEffects(); 
  renderAttacks();        
  updateArmorLockUI();;
  updateArmorLockUI();
  renderSkills();
  runPendingChoiceFlow();
  updateHitPoints();
  updateProfBonusUI();
  renderSavingThrows();
  updateArmorLockText();
  syncDetailButtons();
  updateArmorerModeUI();
  updateWeaponLockUI();
});
