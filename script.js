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
import {
  renderSpellList,
  renderSpellsKnown
} from "./ui/spellList.js";

import { renderPreparedSpells } from "./ui/preparedSpells.js";
import { openDetail } from "./ui/router.js";
import { renderAlwaysPreparedSpells } from "./ui/alwaysPreparedSpells.js";
import { calculateArmorClass } from "./engine/calculateArmorClass.js";
import { renderCantripsKnown } from "./ui/cantripsKnown.js";
import { renderSpellbook } from "./ui/spellbook.js";
import {
  updateOstrumiteCharges,
  bindOstrumiteChargeControls
} from "./ui/ostrumiteCharges.js";
import {
  updateManifestEnergy,
  bindManifestEnergyControls
} from "./ui/manifestEnergy.js";
import { initDispositionUI } from "./ui/disposition.js";
import { renderManifestTechniques } from "./ui/manifestTechniques.js";
import { exportCharacterPdf } from "./ui/exportPdf.js";
import { renderWeaponMods } from "./ui/weaponMods.js";
import { renderInvocationChoice } from "./ui/invocationChoice.js";
import { renderPactBoonChoice } from "./ui/pactBoonChoice.js";
import { initDMView } from "./dm/dmView.js";


/* =========================
   Helpers
========================= */
const FEAT_LEVELS = [4, 8, 12, 16, 19];

function initSheetLayoutV2() {
  const root = document.getElementById("app-root");
  if (!root || document.getElementById("sheetShell")) return;

  const shell = document.createElement("div");
  shell.id = "sheetShell";

  const rail = document.createElement("aside");
  rail.id = "sheetRail";

  const main = document.createElement("section");
  main.id = "sheetMain";

  const tabs = document.createElement("nav");
  tabs.id = "sheetTabs";
  tabs.setAttribute("aria-label", "Character sheet sections");
  const densityControls = document.createElement("div");
  densityControls.id = "sheetDensityControls";

  const tabBody = document.createElement("div");
  tabBody.id = "sheetTabBody";

  const tabDefs = [
    { id: "build", label: "Build" },
    { id: "combat", label: "Combat" },
    { id: "spells", label: "Spells" },
    { id: "features", label: "Features" },
    { id: "inventory", label: "Inventory" }
  ];

  const panes = {};
  const tabButtons = {};

  tabDefs.forEach((tab, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sheet-tab-btn";
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.setAttribute("aria-selected", idx === 0 ? "true" : "false");
    tabButtons[tab.id] = btn;
    tabs.appendChild(btn);

    const pane = document.createElement("div");
    pane.className = "sheet-tab-pane";
    pane.dataset.tab = tab.id;
    pane.hidden = idx !== 0;
    panes[tab.id] = pane;
    tabBody.appendChild(pane);
  });

  const densityDefs = [
    { id: "comfortable", label: "Comfortable" },
    { id: "compact", label: "Compact" }
  ];
  const densityButtons = {};

  densityDefs.forEach(def => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "density-btn";
    btn.dataset.density = def.id;
    btn.textContent = def.label;
    densityButtons[def.id] = btn;
    densityControls.appendChild(btn);
  });

  tabs.appendChild(densityControls);

  main.appendChild(tabs);
  main.appendChild(tabBody);
  shell.appendChild(rail);
  shell.appendChild(main);
  root.prepend(shell);

  const getPanelByControl = (id) =>
    document.getElementById(id)?.closest(".panel") || null;

  const panelRefs = {
    character: getPanelByControl("name"),
    background: getPanelByControl("backgroundSelect"),
    classLevel: getPanelByControl("classSelect"),
    rest: getPanelByControl("shortRestBtn"),
    abilities: getPanelByControl("str"),
    languages: getPanelByControl("languageSelect"),
    skills: getPanelByControl("skill-acrobatics"),
    saves: getPanelByControl("save-str"),
    infusions: document.getElementById("infusionsPanel"),
    disposition: document.getElementById("dispositionPanel"),
    manifestTechniques: document.getElementById("manifestTechniquesPanel"),
    spellcasting: document.querySelector(".spellcasting-panel"),
    features: getPanelByControl("featuresList"),
    weapons: getPanelByControl("weaponsSelect"),
    hitPoints: getPanelByControl("maxHp"),
    combat: getPanelByControl("armorClass"),
    weaponMods: document.getElementById("weaponModsPanel"),
    ostrumiteCharges: document.getElementById("ostrumiteChargesPanel"),
    manifestEnergy: document.getElementById("manifestEnergyPanel"),
    magicItems: getPanelByControl("magicItemsSelect")
  };

  const moved = new Set();
  const movePanel = (target, panel) => {
    if (!target || !panel || moved.has(panel)) return;
    target.appendChild(panel);
    moved.add(panel);
  };

  movePanel(rail, panelRefs.character);
  movePanel(rail, panelRefs.background);
  movePanel(rail, panelRefs.classLevel);
  movePanel(rail, panelRefs.rest);
  movePanel(rail, panelRefs.abilities);

  movePanel(panes.build, panelRefs.languages);
  movePanel(panes.build, panelRefs.skills);
  movePanel(panes.build, panelRefs.saves);
  movePanel(panes.build, panelRefs.disposition);
  movePanel(panes.build, panelRefs.manifestTechniques);
  movePanel(panes.build, panelRefs.infusions);

  movePanel(panes.spells, panelRefs.spellcasting);

  movePanel(panes.features, panelRefs.features);

  movePanel(panes.combat, panelRefs.hitPoints);
  movePanel(panes.combat, panelRefs.weapons);
  movePanel(panes.combat, panelRefs.combat);
  movePanel(panes.combat, panelRefs.ostrumiteCharges);
  movePanel(panes.combat, panelRefs.manifestEnergy);
  movePanel(panes.combat, panelRefs.weaponMods);

  movePanel(panes.inventory, panelRefs.magicItems);

  const activateTab = (tabId) => {
    Object.keys(tabButtons).forEach(id => {
      const active = id === tabId;
      tabButtons[id].setAttribute("aria-selected", active ? "true" : "false");
      tabButtons[id].classList.toggle("active", active);
      panes[id].hidden = !active;
    });
  };

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".sheet-tab-btn");
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });

  const applyDensity = (density) => {
    const next = density === "compact" ? "compact" : "comfortable";
    document.body.dataset.density = next;

    Object.keys(densityButtons).forEach(id => {
      const active = id === next;
      densityButtons[id].classList.toggle("active", active);
      densityButtons[id].setAttribute("aria-pressed", active ? "true" : "false");
    });

    try {
      localStorage.setItem("sheetDensity", next);
    } catch (_e) {
      // Ignore local storage errors
    }
  };

  densityControls.addEventListener("click", (e) => {
    const btn = e.target.closest(".density-btn");
    if (!btn) return;
    applyDensity(btn.dataset.density);
  });

  let savedDensity = "comfortable";
  try {
    savedDensity = localStorage.getItem("sheetDensity") || "comfortable";
  } catch (_e) {
    savedDensity = "comfortable";
  }
  applyDensity(savedDensity);

  activateTab("build");
}

initSheetLayoutV2();

function canChooseFeat() {
  const lvl = character.level || 1;
  return FEAT_LEVELS.includes(lvl) && character.feats.lastFeatLevelTaken !== lvl;
}

function parseFeatRequirements(feat) {
  const propLine = feat.contents.find(c => c.startsWith("property | Type/Prerequisites |"));
  if (!propLine) return { minLevel: 0 };

  const match = propLine.match(/\((.*?)\)/);
  if (!match) return { minLevel: 0 };

  const text = match[1];
  const levelMatch = text.match(/Lvl\s*(\d+)/i);
  const minLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0;

  return { minLevel, raw: text };
}

function reconcileFeatsForLevel(level) {
  if (!character.feats?.active) return;

  // Remove feats taken at levels above current level
  character.feats.active = character.feats.active.filter(feat => feat.level <= level);

  // Recalculate lastFeatLevelTaken
  character.feats.lastFeatLevelTaken = character.feats.active.reduce(
    (max, feat) => Math.max(max, feat.level),
    0
  );
}
character.languages ??= [];
let languageChoices = null;

function syncLanguageSelectFromCharacter() {
  const select = document.getElementById("languageSelect");
  if (!select) return;

  const values = Array.isArray(character.languages) ? character.languages : [];
  Array.from(select.options).forEach(opt => {
    opt.selected = values.includes(opt.value);
  });

  if (languageChoices) {
    languageChoices.removeActiveItems();
    if (values.length) {
      languageChoices.setChoiceByValue(values);
    }
  }
}

function initLanguageSelect() {
  const select = document.getElementById("languageSelect");
  if (!select) return;

  if (!languageChoices) {
    languageChoices = new Choices(select, {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: "Select languages..."
    });

    select.addEventListener("change", () => {
      character.languages = Array.from(select.selectedOptions).map(o => o.value);
    });
  }

  syncLanguageSelectFromCharacter();
}
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return await res.json();
}

function setJsonReplacer(_key, value) {
  if (value instanceof Set) {
    return { __type: "Set", values: [...value] };
  }
  return value;
}

function setJsonReviver(_key, value) {
  if (
    value &&
    typeof value === "object" &&
    value.__type === "Set" &&
    Array.isArray(value.values)
  ) {
    return new Set(value.values);
  }
  return value;
}

function toSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

function normalizeNumberArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Number.isFinite))];
}

function normalizeCharacterState(state) {
  state.race ??= { id: null, name: null };
  state.background ??= { id: null, name: null, source: null };
  state.abilities ??= { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  state.pendingChoices ??= { skills: null, tools: null, infusions: null, languages: null };
  state.resolvedChoices ??= {
    skills: false,
    tools: false,
    subclass: false,
    infusions: false,
    background: false
  };
  state.savingThrows ??= {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false
  };
  state.proficiencies ??= {};
  state.proficiencies.armor = toSet(state.proficiencies.armor);
  state.proficiencies.weapons = toSet(state.proficiencies.weapons);
  state.proficiencies.tools = toSet(state.proficiencies.tools);
  state.proficiencies.skills = toSet(state.proficiencies.skills);
  state.proficiencies.languages = toSet(state.proficiencies.languages);
  state.proficiencies.vehicles = toSet(state.proficiencies.vehicles);
  state.proficiencies.expertise = toSet(state.proficiencies.expertise);

  state.hp ??= { hitDie: null, max: 0, current: 0, temp: 0, hitDiceSpent: 0, levelRolls: [] };
  state.hp.levelRolls = Array.isArray(state.hp.levelRolls)
    ? state.hp.levelRolls.map(Number).filter(n => Number.isFinite(n) && n > 0)
    : [];
  state.features ??= [];
  state.feats ??= { active: [], lastFeatLevelTaken: 0 };
  state.feats.active ??= [];

  state.spellcasting ??= {};
  state.spellcasting.cantrips = toSet(state.spellcasting.cantrips);
  state.spellcasting.available = toSet(state.spellcasting.available);
  state.spellcasting.expandedList = toSet(state.spellcasting.expandedList);
  state.spellcasting.prepared = toSet(state.spellcasting.prepared);
  state.spellcasting.alwaysPrepared = toSet(state.spellcasting.alwaysPrepared);
  state.spellcasting.slots ??= { max: {}, used: {} };
  state.spellcasting.bardSpellReplacement ??= { pendingLevel: null, usedLevels: [] };
  state.spellcasting.bardSpellReplacement.usedLevels = normalizeNumberArray(
    state.spellcasting.bardSpellReplacement.usedLevels
  );

  state.infusions ??= {};
  state.infusions.known = toSet(state.infusions.known);
  state.infusions.active = toSet(state.infusions.active);
  state.infusions.targets ??= {};

  state.equipment ??= {};
  state.equipment.shield = !!state.equipment.shield;
  state.equipment.ostrumiteModsOwned = toSet(state.equipment.ostrumiteModsOwned);
  state.equipment.gun ??= {};
  state.equipment.gun.mods ??= {};
  state.equipment.gun.mods.equipped = toSet(state.equipment.gun.mods.equipped);
  state.equipment.gun.mods.inventory = toSet(state.equipment.gun.mods.inventory);

  state.items ??= { inventory: [], attuned: [] };
  state.items.inventory ??= [];
  state.items.attuned ??= [];

  state.weapons ??= [];
  state.combat ??= {};
  state.combat.ostrumiteCharges ??= { current: 0, max: 0 };
  state.combat.manifestEnergy ??= { current: 0, max: 0 };
  state.combat.sorceryPoints ??= { current: 0, max: 0 };
  state.combat.ki ??= { current: 0, max: 0 };
  state.combat.layOnHands ??= { current: 0, max: 0 };
  if (state.combat?.arcaneShot) {
    state.combat.arcaneShot.knownShots = toSet(state.combat.arcaneShot.knownShots);
  }
  state.invocations = toSet(state.invocations);
  state.languages ??= [];
}

function replaceCharacterState(nextState) {
  Object.keys(character).forEach(key => delete character[key]);
  Object.assign(character, nextState);
}

function syncFormInputsFromCharacter() {
  const nameInput = document.getElementById("name");
  if (nameInput) nameInput.value = character.name || "";

  const levelInput = document.getElementById("level");
  if (levelInput && character.level != null) {
    levelInput.value = String(character.level);
  }

  ["str", "dex", "con", "int", "wis", "cha"].forEach(stat => {
    const input = document.getElementById(stat);
    if (input && character.abilities?.[stat] != null) {
      input.value = String(character.abilities[stat]);
    }
  });

  const classSelect = document.getElementById("classSelect");
  if (classSelect && character.class?.id) classSelect.value = character.class.id;

  const raceSelect = document.getElementById("raceSelect");
  if (raceSelect && character.race?.id) raceSelect.value = character.race.id;

  const backgroundSelect = document.getElementById("backgroundSelect");
  if (backgroundSelect && character.background?.id) {
    backgroundSelect.value = character.background.id;
  }

  const armorSelect = document.getElementById("armorSelect");
  if (armorSelect) armorSelect.value = character.equipment?.armor || "";

  const shieldToggle = document.getElementById("shieldToggle");
  if (shieldToggle) shieldToggle.checked = !!character.equipment?.shield;
}

async function refreshUiAfterCharacterImport() {
  syncFormInputsFromCharacter();
  bindCharacterNameInput();
  initLanguageSelect();
  updateSubclassUI();

  const race = races.find(r => r.id === character.race?.id);
  if (race) renderRaceDetails(race);

  const bg = backgrounds.find(b => b.id === character.background?.id);
  if (bg) renderBackgroundDetails(bg);

  recalcAllAbilities();
  updateRaceBonusDisplay();
  updateSpellcastingVisibility();
  renderManifestTechniques();
  updateManifestEnergy();
  updateOstrumiteCharges();
  renderSavingThrows();
  renderFeatures();
  renderSkills();
  updateAbilityRollerUI();
  renderExpertiseToggles();
  initClassResources();
  bindClassResourceControls();
  renderClassResources();
  renderInfusions();
  renderAllSpellUI();
  updateHitPoints();
  updateProfBonusUI();
  await updateCombat();
  applyInfusionEffects();
  renderAttacks();
  updateFighterUI();
  syncDetailButtons();
  updateArmorLockUI();
  updateArmorLockText();
  updateArmorerModeUI();
  updateWeaponLockUI();
  renderActiveFeats();
  renderSoulTrinkets();
  updateRageUI();
  renderInvocationChoice();
  renderPactBoonChoice();
  renderToolDropdown();

  if (character.class?.id && character.spellcasting?.enabled) {
    await initSpellSlots();
    renderSpellSlots();
  } else {
    const slotsEl = document.getElementById("spellSlots");
    if (slotsEl) slotsEl.innerHTML = "";
  }
}

function exportCharacterJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    character
  };

  const blob = new Blob([JSON.stringify(payload, setJsonReplacer, 2)], {
    type: "application/json"
  });

  const safeName = (character.name || "character")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName || "character"}.character.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importCharacterJsonFile(file) {
  const raw = await file.text();
  const parsed = JSON.parse(raw, setJsonReviver);
  const nextState =
    parsed && typeof parsed === "object" && parsed.character
      ? parsed.character
      : parsed;

  if (!nextState || typeof nextState !== "object" || Array.isArray(nextState)) {
    throw new Error("Invalid character JSON format");
  }

  replaceCharacterState(nextState);
  normalizeCharacterState(character);
  await refreshUiAfterCharacterImport();
}

function bindCharacterJsonImportExport() {
  const exportBtn = document.getElementById("exportCharacterBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportCharacterJson);
  }

  const importInput = document.getElementById("importCharacterInput");
  if (importInput) {
    importInput.addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        await importCharacterJsonFile(file);
        alert("Character imported.");
      } catch (err) {
        console.error(err);
        alert("Invalid character file.");
      } finally {
        importInput.value = "";
      }
    });
  }
}

/* =========================
   Feats – Data Loader
========================= */
let FEATS_DATA = [];

async function loadFeats() {
  try {
    const res = await fetch("./data/feats.json");
    FEATS_DATA = await res.json();
  } catch (e) {
    console.error("Failed to load feats.json", e);
  }
}

// 🔑 DEBUG + UI EXPORT BINDING
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportPdfBtn");
  bindCharacterJsonImportExport();

  if (!btn) {
    console.warn("Export PDF button not found");
    return;
  }

  btn.addEventListener("click", () => {
    exportCharacterPdf();
  });
});

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

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollAbilityScoreStandard() {
  const dice = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

async function applyAbilityScoreValue(stat, value) {
  const input = document.getElementById(stat);
  character.abilities[stat] = Number(value);
  if (input) input.value = String(value);

  recalcAllAbilities();
  await updateCombat();
  renderAttacks();
  updateHitPoints();
}

function updateAbilityRollerUI() {
  const toggle = document.getElementById("enableAbilityRolls");
  const rollAllBtn = document.getElementById("rollAllAbilitiesBtn");
  const rollResult = document.getElementById("abilityRollResult");
  if (!toggle || !rollAllBtn || !rollResult) return;

  const canRoll = !!toggle.checked && Number(character.level ?? 1) === 1;
  rollAllBtn.hidden = !canRoll;

  const stats = ["str", "dex", "con", "int", "wis", "cha"];
  stats.forEach(stat => {
    const input = document.getElementById(stat);
    const row = input?.closest(".ability");
    if (!row || !input) return;

    row.querySelector(".ability-roll-btn")?.remove();
    if (!canRoll) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ability-roll-btn";
    btn.textContent = "Roll";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rolled = rollAbilityScoreStandard();
      await applyAbilityScoreValue(stat, rolled);
      rollResult.textContent = `${stat.toUpperCase()} rolled: ${rolled} (4d6 drop lowest)`;
    });
    row.appendChild(btn);
  });

  if (!canRoll) {
    rollResult.textContent = "Ability roller is optional and only available at Level 1.";
  }
}

function proficiencyBonus(level) {
  return Math.ceil(1 + level / 4);
}

function unlockBardSpellReplacement(prevLevel, newLevel) {
  if (character.class?.id !== "bard") return;
  if (newLevel <= prevLevel || newLevel <= 1) return;

  character.spellcasting ??= {};
  character.spellcasting.bardSpellReplacement ??= {
    pendingLevel: null,
    usedLevels: []
  };

  const replacement = character.spellcasting.bardSpellReplacement;
  replacement.usedLevels = normalizeNumberArray(replacement.usedLevels);

  if (!replacement.usedLevels.includes(newLevel)) {
    replacement.pendingLevel = newLevel;
  }
}

function updateBardSpellReplacementBadge() {
  const badge = document.getElementById("bardSpellReplacementBadge");
  if (!badge) return;

  const replacement = character.spellcasting?.bardSpellReplacement;
  const level = Number(character.level ?? 0);
  const canReplace =
    character.class?.id === "bard" &&
    level > 1 &&
    replacement?.pendingLevel === level;

  badge.hidden = !canReplace;
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

function bindCharacterNameInput() {
  const input = document.getElementById("name");
  if (!input) return;

  // hydrate from state
  input.value = character.name || "";

  input.oninput = e => {
    character.name = e.target.value;
  };
}

function applyBackground(bg) {
  if (!bg) return;

  // 🔒 ENSURE SETS EXIST
  character.proficiencies ??= {};
  character.proficiencies.skills ??= new Set();
  character.proficiencies.tools ??= new Set();


  /* =========================
     STORE BACKGROUND
  ========================= */
  character.background = {
    id: bg.id,
    name: bg.name,
    source: bg.source ?? "background"
  };

  /* =========================
     RESET OLD BACKGROUND DATA
  ========================= */
  character.features = character.features.filter(
    f => f.source !== "background"
  );

  /* =========================
     SKILL PROFICIENCIES
  ========================= */
  bg.skillProficiencies?.forEach(skill => {
    character.proficiencies.skills.add(skill);
  });

  /* =========================
     TOOL PROFICIENCIES
  ========================= */
  bg.toolProficiencies?.forEach(tool => {
    character.proficiencies.tools.add(tool);
  });

  /* =========================
     FEAT (BACKGROUND FEAT)
  ========================= */
  if (bg.feat) {
    character.feats ??= { active: [], lastFeatLevelTaken: 0 };

    if (!character.feats.active.some(f => f.id === bg.feat)) {
      character.feats.active.push({
        id: bg.feat,
        title: bg.feat
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase()),
        source: "background",
        level: 1
      });
    }
  }

  /* =========================
     FEATURES
  ========================= */
  bg.features?.forEach(f => {
    character.features.push({
      ...f,
      source: "background",
      level: 0
    });
  });

  /* =========================
     EQUIPMENT (DISPLAY ONLY)
  ========================= */
  character.backgroundEquipmentOptions =
    bg.equipmentOptions ?? [];

  window.dispatchEvent(new Event("features-updated"));
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

/* =========================
   Feats – Rendering
========================= */
function renderActiveFeats() {
  character.feats ??= {};
  character.feats.active ??= [];

  const el = document.getElementById("activeCharacterFeats");
  if (!el) return;

  el.innerHTML = "";

  if (!character.feats.active.length) {
    el.textContent = "—";
    return;
  }

  character.feats.active.forEach(feat => {
    const div = document.createElement("div");
    div.className = "active-feat";

    const lines = Array.isArray(feat.contents) ? feat.contents : [];

    div.innerHTML = `
      <strong>${feat.title}</strong>
      ${lines.map(line => `<p>${line}</p>`).join("")}
    `;

    el.appendChild(div);
  });
}


function populateBackgroundDropdown() {
  const select = document.getElementById("backgroundSelect");
  if (!select) return;

  select.innerHTML = `<option value="">— Select Background —</option>`;

  backgrounds.forEach(bg => {
    const opt = document.createElement("option");
    opt.value = bg.id;
    opt.textContent = bg.name;
    select.appendChild(opt);
  });
}

let magicItemChoices = null;

export function initMagicItemSelect() {
  const select = document.getElementById("magicItemsSelect");
  if (!select || magicItemChoices) return;

  select.innerHTML = "";

  ALL_MAGIC_ITEMS.forEach(item => {
    const opt = document.createElement("option");

    const id = item.title.toLowerCase().replace(/\s+/g, "-");
    opt.value = id;
    opt.textContent = item.title;

    select.appendChild(opt);
  });

  magicItemChoices = new Choices(select, {
    removeItemButton: true,
    searchEnabled: true,
    placeholder: true,
    placeholderValue: "Select magic items..."
  });

  select.addEventListener("change", () => {
    character.items.inventory = Array.from(
      select.selectedOptions
    ).map(o => o.value);

    renderAttunementUI();
    window.dispatchEvent(new Event("items-changed"));
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

function toggleRage() {
  const rage = character.combat?.rage;
  if (!rage) return;

  // Turn ON
  if (!rage.active) {
    if (rage.remaining <= 0) return;
    rage.active = true;
    rage.remaining--;
  }
  // Turn OFF
  else {
    rage.active = false;
  }
}
function updateRageUI() {
  const panel = document.getElementById("barbarianRage");
  if (!panel) return;

  // Hide for non-barbarians
  if (character.class?.id !== "barbarian" || !character.combat?.rage) {
    panel.hidden = true;
    return;
  }

  const rage = character.combat.rage;

  panel.hidden = false;

  document.getElementById("rageRemaining").textContent =
    rage.remaining;

  document.getElementById("rageMax").textContent =
    rage.max === Infinity ? "∞" : rage.max;

  document.getElementById("rageStatus").textContent =
    rage.active ? "Raging" : "Not Raging";

  document.getElementById("rageBtn").textContent =
    rage.active ? "End Rage" : "Rage";
}

function initClassResources() {
  character.combat ??= {};
  const level = Number(character.level ?? 1);
  const classId = character.class?.id;

  if (classId === "sorcerer") {
    const prev = character.combat.sorceryPoints ?? {};
    const max = Math.max(1, level);
    const current = Number.isFinite(prev.current) ? Math.min(prev.current, max) : max;
    character.combat.sorceryPoints = { current, max };
  } else {
    delete character.combat.sorceryPoints;
  }

  if (classId === "monk" && level >= 2) {
    const prev = character.combat.ki ?? {};
    const max = level;
    const current = Number.isFinite(prev.current) ? Math.min(prev.current, max) : max;
    character.combat.ki = { current, max };
  } else {
    delete character.combat.ki;
  }

  if (classId === "paladin") {
    const prev = character.combat.layOnHands ?? {};
    const max = level * 5;
    const current = Number.isFinite(prev.current) ? Math.min(prev.current, max) : max;
    character.combat.layOnHands = { current, max };
  } else {
    delete character.combat.layOnHands;
  }
}

function renderClassResources() {
  const panel = document.getElementById("classResourcesPanel");
  if (!panel) return;

  const classId = character.class?.id;
  const level = Number(character.level ?? 1);
  const showSorcery = classId === "sorcerer" && character.combat?.sorceryPoints;
  const showKi = classId === "monk" && level >= 2 && character.combat?.ki;
  const showLayOnHands = classId === "paladin" && character.combat?.layOnHands;

  const sorceryRow = document.getElementById("sorceryPointsRow");
  const kiRow = document.getElementById("kiPointsRow");
  const layOnHandsRow = document.getElementById("layOnHandsRow");
  if (sorceryRow) sorceryRow.hidden = !showSorcery;
  if (kiRow) kiRow.hidden = !showKi;
  if (layOnHandsRow) layOnHandsRow.hidden = !showLayOnHands;
  panel.hidden = !(showSorcery || showKi || showLayOnHands);

  if (showSorcery) {
    const current = Number(character.combat.sorceryPoints.current ?? 0);
    const max = Number(character.combat.sorceryPoints.max ?? 0);
    const minus = document.getElementById("sorceryPointsMinus");
    const plus = document.getElementById("sorceryPointsPlus");
    document.getElementById("sorceryPointsCurrent").textContent = String(current);
    document.getElementById("sorceryPointsMax").textContent = String(max);
    if (minus) minus.disabled = current <= 0;
    if (plus) plus.disabled = current >= max;
  }

  if (showKi) {
    const current = Number(character.combat.ki.current ?? 0);
    const max = Number(character.combat.ki.max ?? 0);
    const minus = document.getElementById("kiPointsMinus");
    const plus = document.getElementById("kiPointsPlus");
    document.getElementById("kiPointsCurrent").textContent = String(current);
    document.getElementById("kiPointsMax").textContent = String(max);
    if (minus) minus.disabled = current <= 0;
    if (plus) plus.disabled = current >= max;
  }

  if (showLayOnHands) {
    const current = Number(character.combat.layOnHands.current ?? 0);
    const max = Number(character.combat.layOnHands.max ?? 0);
    const minus = document.getElementById("layOnHandsMinus");
    const plus = document.getElementById("layOnHandsPlus");
    document.getElementById("layOnHandsCurrent").textContent = String(current);
    document.getElementById("layOnHandsMax").textContent = String(max);
    if (minus) minus.disabled = current <= 0;
    if (plus) plus.disabled = current >= max;
  }
}

function bindClassResourceControls() {
  const panel = document.getElementById("classResourcesPanel");
  if (!panel || panel.dataset.bound === "true") return;
  panel.dataset.bound = "true";

  const adjust = (key, delta) => {
    const resource = character.combat?.[key];
    if (!resource) return;
    const max = Number(resource.max ?? 0);
    const current = Number(resource.current ?? 0);
    resource.current = Math.max(0, Math.min(max, current + delta));
    renderClassResources();
  };

  document.getElementById("sorceryPointsMinus")?.addEventListener("click", () => adjust("sorceryPoints", -1));
  document.getElementById("sorceryPointsPlus")?.addEventListener("click", () => adjust("sorceryPoints", 1));
  document.getElementById("kiPointsMinus")?.addEventListener("click", () => adjust("ki", -1));
  document.getElementById("kiPointsPlus")?.addEventListener("click", () => adjust("ki", 1));
  document.getElementById("layOnHandsMinus")?.addEventListener("click", () => adjust("layOnHands", -1));
  document.getElementById("layOnHandsPlus")?.addEventListener("click", () => adjust("layOnHands", 1));
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

  if (character.class?.id === "monk" && character.combat?.ki) {
    character.combat.ki.current = character.combat.ki.max;
    log.push("Ki restored");
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
  if (character.class?.id === "sorcerer" && character.combat?.sorceryPoints) {
    character.combat.sorceryPoints.current = character.combat.sorceryPoints.max;
    log.push("Sorcery Points restored");
  }
  if (character.class?.id === "monk" && character.combat?.ki) {
    character.combat.ki.current = character.combat.ki.max;
    log.push("Ki restored");
  }
  if (character.class?.id === "paladin" && character.combat?.layOnHands) {
    character.combat.layOnHands.current = character.combat.layOnHands.max;
    log.push("Lay on Hands restored");
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
  const res = await fetch(`./data/spellSlots/${classId}.json`);

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
function renderAttunementUI() {
  const container = document.getElementById("attunedItems");
  if (!container) return;

  container.innerHTML = "";

  const attunable = character.items.inventory
    .map(id => ALL_MAGIC_ITEMS.find(i =>
      i.title.toLowerCase().replace(/\s+/g, "-") === id
    ))
    .filter(i => i?.tags.includes("attunement"));

  attunable.forEach(item => {
    const id = item.title.toLowerCase().replace(/\s+/g, "-");

    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = character.items.attuned.includes(id);

    cb.onchange = () => {
      if (cb.checked) {
        if (character.items.attuned.length >= 3) {
          alert("You can only attune to 3 items.");
          cb.checked = false;
          return;
        }
        character.items.attuned.push(id);
      } else {
        character.items.attuned =
          character.items.attuned.filter(x => x !== id);
      }
    };

    label.appendChild(cb);
    label.append(` ${item.title}`);
    container.appendChild(label);
  });
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
function normalizeWeapon(w) {
  const props = {};
  let damage = { dice: "—", type: "—" };
  let properties = [];

  (w.contents || []).forEach(line => {
    const parts = line.split("|").map(s => s.trim());
    if (parts[0] !== "property") return;

    const label = parts[1];
    const value = parts[2];

    if (label === "Damage") {
      const match = value.match(/(\d+d\d+)\s*(\w+)/i);
      if (match) {
        damage = { dice: match[1], type: match[2] };
      }
    }

    if (label === "Properties") {
      properties = value.split(",").map(p => p.trim());
    }
  });

  return {
    id: w.title.toLowerCase().replace(/\s+/g, "-"),
    name: w.title,
    damage,
    properties,
    tags: w.tags || []
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
  renderSpellsKnown();
  updateBardSpellReplacementBadge();
  renderWeaponMods(character);
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
let ALL_MAGIC_ITEMS = [];
/* =========================
   Ability Math
========================= */
function getAbilityScore(stat) {
  const base = Number(character.abilities?.[stat] ?? 10);
  const race = Number(character.appliedRaceAsi?.[stat] ?? 0);
  return base + race;
}

function getChoiceOptionsPaths(optionsSource, sourceClass) {
  if (optionsSource === "fighting-styles") {
    const byClass = sourceClass ? `./data/fighting-styles/${sourceClass}.json` : null;
    return [byClass, "./data/fighting-styles/fighter.json"].filter(Boolean);
  }

  if (optionsSource === "tools/artisan") {
    return ["./data/tools/artisan-tools.json"];
  }

  return [`./data/${optionsSource}.json`];
}

async function loadChoiceOptions(optionsSource, sourceClass) {
  const candidatePaths = getChoiceOptionsPaths(optionsSource, sourceClass);

  for (const path of candidatePaths) {
    const res = await fetch(path);
    if (!res.ok) continue;
    const data = await res.json();
    if (Array.isArray(data)) return data;
  }

  throw new Error(
    `Failed to load choice options for "${optionsSource}" from: ${candidatePaths.join(", ")}`
  );
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

  let options = [];
  try {
    options = await loadChoiceOptions(feature.optionsSource, sourceClass);
  } catch (err) {
    console.error(err, feature);
    return;
  }

  const chosenFeatureIds = new Set((character.features || []).map(f => f.id));
  const filteredOptions = options.filter(
    opt => opt && opt.id && !chosenFeatureIds.has(opt.id)
  );

  if (filteredOptions.length === 0) {
    optionsEl.innerHTML = `<p class="muted">No available options remain for ${feature.name}.</p>`;
    modal.hidden = false;
    backdrop.hidden = false;
    return;
  }

  let selected = null;

  filteredOptions.forEach(opt => {
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
    if (character.features.some(f => f.id === selected.id)) return;

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
async function loadMagicItems() {
  ALL_MAGIC_ITEMS = await loadJson("./data/magic-items.json");
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
  character.proficiencies.expertise ??= new Set();
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
      const key = cb.dataset.skillId;
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
  if (!res.ok) throw new Error("Failed to load normalized backgrounds");

  backgrounds = await res.json();
}



function renderBackgroundDetails(bg) {
  const el = document.getElementById("backgroundDetails");
  if (!el || !bg) return;

  el.innerHTML = "";

  if (bg.skillProficiencies?.length) {
    el.innerHTML += `<div><strong>Skills:</strong> ${bg.skillProficiencies.join(", ")}</div>`;
  }

  if (bg.toolProficiencies?.length) {
    el.innerHTML += `<div><strong>Tools:</strong> ${bg.toolProficiencies.join(", ")}</div>`;
  }

  if (bg.feat) {
    el.innerHTML += `<div><strong>Feat:</strong> ${bg.feat}</div>`;
  }

  if (bg.equipmentOptions?.length) {
    el.innerHTML += `<div><strong>Equipment:</strong><br>${bg.equipmentOptions.join("<br>")}</div>`;
  }
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
  if (!race) return;

  /* =========================
     STORE RACE (SOURCE OF TRUTH)
  ========================= */
  character.race = {
    id: race.id,
    name: race.name,
    contents: race.contents
  };

  character.raceSource = race.source ?? null;

  /* =========================
     RESET RACE-DERIVED STATE
  ========================= */
  const newRaceAsi = {
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
  };


  character.combat.speed = 30;
  character.features ??= [];

  // 🔥 Remove old race features if switching races
  character.features = character.features.filter(f => f.source !== "race");

  /* =========================
     PARSE RACE CONTENTS
  ========================= */
  race.contents.forEach((line, index) => {
    if (
      !line.startsWith("property") &&
      !line.startsWith("Description") &&
      !line.startsWith("Race Trait")
    ) return;

    const [rawType, rawName, rawValue] = line
      .split("|")
      .map(s => s.trim());

    const type = rawType;   // "property" | "Description" | "Race Trait"
    const name = rawName;
    const value = rawValue || "";

    /* =========================
       APPLY MECHANICS (PROPERTY ONLY)
    ========================= */
    if (type === "property") {
      // Ability Score Increases
      if (name === "Ability Scores" && value && !value.includes("choose")) {
        value.split(";").forEach(p => {
          const [stat, amt] = p.trim().split(" ");
          newRaceAsi[stat.slice(0, 3).toLowerCase()] = Number(amt);
        });
      }

      // Speed
      if (name === "Speed" && value) {
        const m = value.match(/(\d+)/);
        if (m) character.combat.speed = Number(m[1]);
      }
    }

    /* =========================
       STORE AS FEATURE (UI + PDF)
    ========================= */
    if (type === "Race Trait") {
      character.features.push({
        id: `race-${race.id}-${index}`,
        name,
        description: value,
        source: "race",
        level: 0,
        category: "race-trait"
      });
    }
  });

  /* =========================
     STORE RACIAL ASI (DO NOT APPLY)
  ========================= */
  appliedRaceAsi = { ...newRaceAsi };          // <-- updates your global UI store
  character.appliedRaceAsi = { ...newRaceAsi }; // <-- keeps PDF + everything else correct

  /* =========================
     UPDATE UI STATE
  ========================= */
  const speedInput = document.getElementById("speed");
  if (speedInput) speedInput.value = character.combat.speed;

  // 🔔 Notify the rest of the app
  window.dispatchEvent(new Event("features-updated"));

}




function runPendingChoiceFlow() {

  if (
    canChooseFeat() &&
    !character.pendingChoices?.spells
  ) {
    character.pendingChoices.feat = true;
    openFeatChoiceModal();
    return;
  }

  if (character.pendingChoices?.skills) {
    renderSkillChoice(character);
    return;
  }

  if (character.pendingSubclassChoice && !character.subclass) {
    openSubclassModal(character.pendingSubclassChoice);
    return;
  }

  function levelGrantsFeat(level) { 
    return [4, 8, 12, 16, 19].includes(level);
  }

  if (
    character.pendingChoices?.spells ||
    character.pendingChoices?.magicalSecrets
  ) {
    if (character.class.id === "wizard") {
      renderSpellbook();
    } else {
      renderSpellsKnown();
    }
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

function openFeatChoiceModal() {
  const modal = document.getElementById("featModal");
  const backdrop = document.getElementById("featBackdrop");
  const optionsDiv = document.getElementById("featOptions");
  const confirmBtn = document.getElementById("confirmFeat");

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) return;

  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;
  modal.hidden = false;
  backdrop.hidden = false;

  let selectedFeat = null;

  const availableFeats = FEATS_DATA.filter(feat => {
    const { minLevel } = parseFeatRequirements(feat);
    return character.level >= minLevel;
  });

  if (availableFeats.length === 0) {
    optionsDiv.innerHTML = `<p>No feats available at this level.</p>`;
    return;
  }

  availableFeats.forEach(feat => {
    const div = document.createElement("div");
    div.className = "feat-option";
    div.innerHTML = `
      <strong>${feat.title}</strong>
      <p>${feat.contents?.[0] ?? ""}</p>
    `;

    div.onclick = () => {
      document
        .querySelectorAll(".feat-option")
        .forEach(e => e.classList.remove("selected"));
      div.classList.add("selected");
      selectedFeat = feat;
      confirmBtn.disabled = false;
    };

    optionsDiv.appendChild(div);
  });

  confirmBtn.onclick = () => {
    if (!selectedFeat) return;

    character.feats.active.push({
      title: selectedFeat.title,
      contents: selectedFeat.contents,
      source: selectedFeat.source,
      level: character.level
    });

    character.feats.lastFeatLevelTaken = character.level;
    delete character.pendingChoices.feat;
    character.resolvedChoices.feat = true;

    modal.hidden = true;
    backdrop.hidden = true;

    renderActiveFeats();
    runPendingChoiceFlow();
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
  const tags = weapon.tags || [];

  if (tags.includes("ranged weapon")) {
    return abilityMod(getAbilityScore("dex"));
  }

  if (props.some(p => p.toLowerCase().includes("finesse"))) {
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
  const damageDice = weapon.damage.dice;
  const damageType = weapon.damage.type;


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
function ensureHpRollState(hitDie) {
  character.hp ??= {};
  character.hp.hitDie = hitDie;
  character.hp.levelRolls ??= [];
}

function syncHpRollsToLevel(level, hitDie) {
  ensureHpRollState(hitDie);
  const rolls = character.hp.levelRolls;
  const needed = Math.max(0, level - 1);

  while (rolls.length > needed) {
    rolls.pop();
  }
}

function applyHpLevelChange(prevLevel, nextLevel) {
  const useAverage = document.getElementById("useAverage")?.checked ?? true;
  const hitDieInput = document.getElementById("hitDie");
  const hitDie = character.hp?.hitDie || Number(hitDieInput?.value) || 8;
  ensureHpRollState(hitDie);

  if (useAverage) {
    syncHpRollsToLevel(nextLevel, hitDie);
    return;
  }

  const rolls = character.hp.levelRolls;
  const targetCount = Math.max(0, nextLevel - 1);

  if (nextLevel < prevLevel) {
    while (rolls.length > targetCount) rolls.pop();
    return;
  }

  const newRolls = [];
  while (rolls.length < targetCount) {
    const r = rollDie(hitDie);
    rolls.push(r);
    newRolls.push(r);
  }

  if (newRolls.length) {
    alert(`HP rolls added for level-up: ${newRolls.join(", ")}`);
  }
}

function updateHitPoints() {
  const maxHpEl = document.getElementById("maxHp");
  const totalHitDiceEl = document.getElementById("totalHitDice");
  const hitDieInput = document.getElementById("hitDie");
  const useAverage = document.getElementById("useAverage");
  if (!maxHpEl || !totalHitDiceEl || !hitDieInput) return;

  const level = character.level || 1;
  const conMod = abilityMod(getAbilityScore("con"));
  const hitDie = Number(hitDieInput.value) || character.hp?.hitDie || 8;
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  ensureHpRollState(hitDie);

  const rolledMode = useAverage ? !useAverage.checked : false;
  syncHpRollsToLevel(level, hitDie);

  let maxHp = Math.max(
    1,
    hitDie + conMod + (level - 1) * (avgPerLevel + conMod)
  );

  if (rolledMode) {
    const rolledLevels = character.hp.levelRolls.slice(0, Math.max(0, level - 1));
    const rolledTotal = rolledLevels.reduce((sum, roll) => sum + roll + conMod, 0);
    maxHp = Math.max(1, hitDie + conMod + rolledTotal);
  }

  character.hp.max = maxHp;
  character.hp.current = Math.min(character.hp.current ?? maxHp, maxHp);

  // UI display
  maxHpEl.textContent = maxHp;
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
  await loadFeats();
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

let dmInitialized = false;

document.getElementById("toggleDM")?.addEventListener("click", async () => {
  document.getElementById("sheetView").hidden = true;
  document.getElementById("dmView").hidden = false;

  if (!dmInitialized) {
    dmInitialized = true;
    await initDMView();
  }
});

document.getElementById("backToSheetBtn")?.addEventListener("click", () => {
  document.getElementById("dmView").hidden = true;
  document.getElementById("sheetView").hidden = false;
});

  document.getElementById("raceSelect")?.addEventListener("change", async e => {
    const race = races.find(r => r.id == e.target.value);
    if (!race) return;

    applyRaceToCharacter(race);
    renderRaceDetails(race);
    bindCharacterNameInput();
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
    renderManifestTechniques();
    updateManifestEnergy();
    bindManifestEnergyControls();
    updateOstrumiteCharges();
    bindOstrumiteChargeControls();
    renderSavingThrows();
    renderFeatures();
    updateSpellcastingVisibility();
    await initSpellSlots();
    updateInfusionsVisibility(classData);
    renderSkills();
    renderExpertiseToggles();
    initFighterResources();
    initClassResources();
    bindClassResourceControls();
    renderInfusions();
    renderAllSpellUI();   // spellcasting + lists
    renderSpellSlots();
    updateHitPoints();
    updateProfBonusUI();
    await updateCombat();
    renderActiveFeats();
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
    initDispositionUI();
    renderInvocationChoice();
    renderPactBoonChoice();
    updateRageUI();
    renderClassResources();
  });

document.getElementById("rageBtn")?.addEventListener("click", () => {
  toggleRage();
  updateRageUI();
});

document.getElementById("enableAbilityRolls")?.addEventListener("change", () => {
  updateAbilityRollerUI();
});

document.getElementById("rollAllAbilitiesBtn")?.addEventListener("click", async () => {
  if (Number(character.level ?? 1) !== 1) return;
  const stats = ["str", "dex", "con", "int", "wis", "cha"];
  const rolled = stats.map(() => rollAbilityScoreStandard());
  const resultEl = document.getElementById("abilityRollResult");

  for (let i = 0; i < stats.length; i += 1) {
    await applyAbilityScoreValue(stats[i], rolled[i]);
  }

  if (resultEl) {
    resultEl.textContent = `Rolled set: ${rolled.join(", ")} (4d6 drop lowest)`;
  }
});

document.getElementById("useAverage")?.addEventListener("change", () => {
  updateHitPoints();
});

document.getElementById("hitDie")?.addEventListener("change", () => {
  updateHitPoints();
});

  document.getElementById("level")?.addEventListener("change", async e => {
  if (!character.class?.id) return;

  const prevLevel = Number(character.level ?? 1);
  const lvl = Number(e.target.value);

  // update single source of truth
  character.level = lvl;
  updateAbilityRollerUI();
  applyHpLevelChange(prevLevel, lvl);
  reconcileFeatsForLevel(lvl);
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
  unlockBardSpellReplacement(prevLevel, lvl);

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
  renderManifestTechniques();
  updateManifestEnergy();
  bindManifestEnergyControls();
  updateOstrumiteCharges();
  bindOstrumiteChargeControls();
  renderSavingThrows();
  renderFeatures();
  renderSkills();
  renderExpertiseToggles();
  await initSpellSlots();
  renderAllSpellUI();
  renderSpellSlots();
  initFighterResources();
  initClassResources();
  bindClassResourceControls();
  renderInfusions();
  updateHitPoints();
  updateProfBonusUI();
  await loadAllTools();
  renderToolDropdown();
  await updateCombat();
  renderActiveFeats();
  applyInfusionEffects();
  renderAttacks();
  updateFighterUI();
  syncDetailButtons();
  updateArmorLockUI();
  updateArmorLockText();
  updateArmorerModeUI();
  updateWeaponLockUI();
  renderSoulTrinkets();
  updateRageUI();
  renderClassResources();



  // This is what opens subclass/tool/skill/infusion modals
  runPendingChoiceFlow();
  initArcaneShotKnownUI();
  renderArcaneShotDetails();
  renderArcaneShotUseDropdown();
  initDispositionUI();
  renderWeaponMods(character);
  renderInvocationChoice();
  renderPactBoonChoice();

});

  /* ===== Event wiring ===== */
  window.addEventListener("weapons-changed", renderAttacks)
  window.addEventListener("skills-updated", () => {
    renderSkills();       
    renderExpertiseToggles();
    renderFeatures();     
    runPendingChoiceFlow(); 
  });
window.addEventListener("abilities-updated", updateOstrumiteCharges);
window.addEventListener("features-updated", () => {
  renderFeatures();
  renderSavingThrows();
});
window.addEventListener("features-updated", updateSteelDefenderUI);
document
  .getElementById("steelDefenderInfo")
  ?.addEventListener("change", updateSteelDefenderUI);
window.addEventListener("level-updated", renderManifestTechniques);

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
window.addEventListener("bard-replacement-updated", updateBardSpellReplacementBadge);

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
  updateManifestEnergy();
  initDispositionUI();
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
window.addEventListener("abilities-updated", updateManifestEnergy);
window.addEventListener("level-updated", updateManifestEnergy);

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
window.addEventListener("level-updated", initDispositionUI);
window.addEventListener("rest-long", renderSpellSlots);
window.addEventListener("rest-short", renderClassResources);
window.addEventListener("rest-long", renderClassResources);
  document.getElementById("shortRestBtn").onclick = applyShortRest;
  document.getElementById("longRestBtn").onclick = applyLongRest;

  /* ===== Weapons ===== */
  fetch("./data/weapons.all.json")
    .then(r => r.json())
    .then(d => {
      ALL_WEAPONS = d.map(w => normalizeWeapon(w));
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
updateArmorLockUI();
initFighterResources();
initClassResources();
bindClassResourceControls();
await loadAllTools();
renderToolDropdown();
initLanguageSelect();
renderSkills();
updateAbilityRollerUI();
renderExpertiseToggles();
runPendingChoiceFlow();
updateHitPoints();
updateProfBonusUI();
renderSavingThrows();
updateArmorLockText();
syncDetailButtons();
renderActiveFeats();
updateArmorerModeUI();
updateWeaponLockUI();
initArcaneShotKnownUI();
renderArcaneShotDetails();
renderArcaneShotUseDropdown();
updateArcaneArcherVisibility();
renderSoulTrinkets();
updateManifestEnergy();
renderClassResources();
initDispositionUI();
await loadMagicItems();
initMagicItemSelect();
bindCharacterNameInput();
renderWeaponMods(character);
renderInvocationChoice();
renderPactBoonChoice();





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
});
});

