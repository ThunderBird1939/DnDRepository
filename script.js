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
function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level) {
  return Math.ceil(1 + level / 4);
}

function fmtSigned(n) {
  return `${n >= 0 ? "+" : ""}${n}`;
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
  // 🔒 Ignore clicks coming from spell UI
  if (e.target.closest(".spellcasting-panel")) return;

  const btn = e.target.closest(".detail-btn");
  if (!btn) return;

  syncDetailButtons();
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
  character.combat.speed = 30;

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
      const m = value.match(/(\d+)/);
      if (m) character.combat.speed = Number(m[1]);
    }
  });

  const speedInput = document.getElementById("speed");
  if (speedInput) speedInput.value = character.combat.speed;
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
function updateCombat() {
  const acEl = document.getElementById("armorClass");
  const initEl = document.getElementById("initiative");
  const baseAc = Number(document.getElementById("baseAc")?.value || 10);
  if (!acEl || !initEl) return;

  const dex = abilityMod(getAbilityScore("dex"));
  acEl.textContent = baseAc + dex;
  initEl.textContent = fmtSigned(dex);
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

  input.addEventListener("input", () => {
    character.abilities[stat] = Number(input.value || 10);
    recalcAllAbilities();
    updateCombat();
    renderAttacks();
    updateHitPoints();
    renderPreparedSpells();
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

  document.getElementById("raceSelect")?.addEventListener("change", e => {
    const race = races.find(r => r.id == e.target.value);
    if (!race) return;

    applyRaceToCharacter(race);
    renderRaceDetails(race);
    updateRaceBonusDisplay();
    recalcAllAbilities();
    updateCombat();
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
    // 🔑 FORCE pending choices immediately
    runPendingChoiceFlow();

    const hitDieInput = document.getElementById("hitDie");
    if (hitDieInput && character.hp?.hitDie) hitDieInput.value = character.hp.hitDie;

    renderTools();
    renderFeatures();
    renderSkills();
    runPendingChoiceFlow();
    updateHitPoints();
    renderSavingThrows();
    updateProfBonusUI();

    window.dispatchEvent(new Event("class-updated"));
    window.dispatchEvent(new Event("features-updated"));

    syncDetailButtons();
  });

  document.getElementById("level")?.addEventListener("change", async e => {
    if (!character.class?.id) return;

    const lvl = Number(e.target.value);
    character.level = lvl;

    const data = await loadClass(character.class.id);
    applyClass(character, data, lvl);

    const hitDieInput = document.getElementById("hitDie");
    if (hitDieInput && character.hp?.hitDie) hitDieInput.value = character.hp.hitDie;

    renderFeatures();
    renderSkills();
    runPendingChoiceFlow();
    updateHitPoints();
    updateProfBonusUI();
    renderSavingThrows();

    window.dispatchEvent(new Event("class-updated"));
    window.dispatchEvent(new Event("features-updated"));

    syncDetailButtons();
  });

  /* ===== Event wiring ===== */
  window.addEventListener("weapons-changed", renderAttacks);
  window.addEventListener("tools-updated", renderTools);
  window.addEventListener("skills-updated", () => {
    renderSkills();          // 🔑 this was missing logically
    renderFeatures();        // optional but correct
    runPendingChoiceFlow();  // continue pipeline
  });

  window.addEventListener("features-updated", async () => {
    renderFeatures();
    renderSavingThrows();
    renderTools();
    renderSpellcasting();
    await renderAlwaysPreparedSpells();
    renderPreparedSpells();
    renderSpellList();
  });

  window.addEventListener("subclass-updated", async () => {
    syncDetailButtons();
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

  /* ===== Initial Render ===== */
  recalcAllAbilities();
  updateRaceBonusDisplay();
  updateCombat();
  renderSkills();
  runPendingChoiceFlow();
  updateHitPoints();
  updateProfBonusUI();
  renderSavingThrows();
  await renderPreparedSpells();
  renderSpellList();
  renderAlwaysPreparedSpells();
  syncDetailButtons();
});
