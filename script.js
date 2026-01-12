/* =========================
   Imports
========================= */
import { character } from "./data/character.js";
import { initWeaponAndSpellSelects } from "./ui/dropdowns.js";
import { loadClass } from "./data/classloader.js";
import { applyClass } from "./engine/applyClass.js";
import { applySubclass } from "./engine/applySubclass.js";
import { renderSkillChoice } from "./ui/skillChoice.js";
import { openInfusionChoiceModal } from "./ui/infusionChoice.js";
import { renderFeatures } from "./ui/features.js";
import { renderSpellcasting } from "./ui/spells.js";
import { renderSpellList } from "./ui/spellList.js";
import { renderPreparedSpells } from "./ui/preparedSpells.js";
import { openDetail } from "./ui/router.js";
import { renderAlwaysPreparedSpells } from "./ui/alwaysPreparedSpells.js";
import { calculateArmorClass } from "./engine/calculateArmorClass.js";

/* =========================
   Character Defaults (SAFETY)
========================= */
character.level ??= 1;

character.abilities ??= {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10
};

character.proficiencies ??= {};
character.proficiencies.skills ??= new Set();
character.proficiencies.tools ??= new Set();

character.weapons ??= [];
character.combat ??= { speed: 30 };

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
    character.class?.level >= 3 &&
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
  if (!el) return;
  el.textContent = fmtSigned(proficiencyBonus(character.level || 1));
}

/* =========================
   Globals
========================= */
let races = [];
let appliedRaceAsi = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
let ALL_WEAPONS = [];
let ALL_ARMOR = [];

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

  if (character.pendingChoices?.tools) {
    openToolChoiceModal();
    return;
  }

  if (character.pendingChoices?.infusions) {
    openInfusionChoiceModal(character);
    return;
  }

  if (character.pendingSubclassChoice && !character.subclass) {
    openSubclassModal(character.pendingSubclassChoice);
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

  const ac = await calculateArmorClass(character);
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

  // 🔒 FUTURE RULE HOOK (not active yet)
  // Disable flight if wearing medium/heavy armor
  // if (character.equipment?.armorCategory !== "light") {
  //   flySpeed = 0;
  // }

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
    const attackBonus = abilityBonus + prof;

    const damageDice = weapon.damage?.[0]?.dice || "—";
    const damageType = weapon.damage?.[0]?.type || "—";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${weapon.name}</td>
      <td>${fmtSigned(attackBonus)}</td>
      <td>${damageDice} ${fmtSigned(abilityBonus)}</td>
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
/* ===== Armor Controls ===== */
document.getElementById("armorSelect")?.addEventListener("change", async e => {
  character.equipment.armor = e.target.value || null;
  await updateCombat();
});

document.getElementById("shieldToggle")?.addEventListener("change", async e => {
  character.equipment.shield = e.target.checked;
  await updateCombat();
});

  document.getElementById("raceSelect")?.addEventListener("change", async e => {
    const race = races.find(r => r.id == e.target.value);
    if (!race) return;

    applyRaceToCharacter(race);
    renderRaceDetails(race);
    updateRaceBonusDisplay();
    recalcAllAbilities();
    await updateCombat();
    renderAttacks();
    updateHitPoints();
    updateProfBonusUI();
    syncDetailButtons();
  });

  document.getElementById("classSelect")?.addEventListener("change", async e => {
    if (!e.target.value) return;

    const level = Number(document.getElementById("level")?.value || 1);
    character.level = level;

    const data = await loadClass(e.target.value);
    applyClass(character, data, level);

    // 🔁 RE-APPLY subclass if already chosen (level changes, reloads, etc.)
    if (character._subclassData) {
      applySubclass(character, character._subclassData);
    }

    // 🔥 THIS WAS MISSING 🔥
    renderSavingThrows();
    renderFeatures();
    renderSkills();
    renderTools();
    renderAllSpellUI();   // spellcasting + lists
    updateHitPoints();
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


  document.getElementById("level")?.addEventListener("change", async e => {
    if (!character.class?.id) return;

    const lvl = Number(e.target.value);
    character.level = lvl;

    const data = await loadClass(character.class.id);
    applyClass(character, data, lvl);

    if (character._subclassData) {
      applySubclass(character, character._subclassData);
    }


    const hitDieInput = document.getElementById("hitDie");
    if (hitDieInput && character.hp?.hitDie) hitDieInput.value = character.hp.hitDie;

    renderFeatures();
    renderSkills();
    runPendingChoiceFlow();
    updateHitPoints();
    updateProfBonusUI();
    renderSavingThrows();
    await updateCombat();
    window.dispatchEvent(new Event("class-updated"));
    syncDetailButtons();
    updateArmorLockUI();
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
  renderAllSpellUI();
});


  window.addEventListener("combat-updated", async () => {
    await updateCombat();
    updateEldritchCannonUI();
  });

  window.addEventListener("subclass-updated", async () => {
    syncDetailButtons();
    updateArmorLockUI();
    updateArmorLockText();
    updateArmorerModeUI();
    await updateCombat();
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


  window.addEventListener("prepared-spells-updated", () => {
    renderSpellList();
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
