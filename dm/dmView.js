// dm/dmView.js
import { dmState } from "./dmState.js";
import { loadMonsters, monsters } from "./monsterLoader.js";

/* =========================
   CONSTANTS (SAFE TOP-LEVEL)
========================= */
const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious"
];

/* =========================
   CONDITION RULES (5E)
========================= */
const CONDITION_RULES = {
  Blinded:
    "A blinded creature canâ€™t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creatureâ€™s attack rolls have disadvantage.",
  Charmed:
    "A charmed creature canâ€™t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on ability checks to interact socially with the creature.",
  Deafened:
    "A deafened creature canâ€™t hear and automatically fails any ability check that requires hearing.",
  Frightened:
    "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature canâ€™t willingly move closer to the source of its fear.",
  Grappled:
    "A grappled creatureâ€™s speed becomes 0, and it canâ€™t benefit from any bonus to its speed.",
  Incapacitated:
    "An incapacitated creature canâ€™t take actions or reactions.",
  Invisible:
    "An invisible creature is impossible to see without the aid of magic or a special sense. Attack rolls against the creature have disadvantage, and the creatureâ€™s attack rolls have advantage.",
  Paralyzed:
    "A paralyzed creature is incapacitated and canâ€™t move or speak. Attack rolls against the creature have advantage, and any attack that hits is a critical hit if the attacker is within 5 feet.",
  Petrified:
    "A petrified creature is transformed into stone, is incapacitated, and unaware of its surroundings. The creature has resistance to all damage.",
  Poisoned:
    "A poisoned creature has disadvantage on attack rolls and ability checks.",
  Prone:
    "A prone creatureâ€™s only movement option is to crawl. The creature has disadvantage on attack rolls, and attack rolls against it have advantage if the attacker is within 5 feet.",
  Restrained:
    "A restrained creatureâ€™s speed becomes 0. Attack rolls against the creature have advantage, and the creatureâ€™s attack rolls have disadvantage.",
  Stunned:
    "A stunned creature is incapacitated, canâ€™t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws.",
  Unconscious:
    "An unconscious creature is incapacitated, prone, and unaware of its surroundings. Attack rolls against the creature have advantage, and any hit within 5 feet is a critical hit."
};

/* =========================
   MODULE-SCOPED UI REFS
========================= */
let initialized = false;
let lastActiveCombatantId = null;

let encounterNameInputEl = null;
let monsterSelectEl = null;

function ensureEncounterDefaults() {
  dmState.encounter ??= {};
  dmState.encounter.name ??= "New Encounter";
  dmState.encounter.round = Number(dmState.encounter.round ?? 1);
  dmState.encounter.turnIndex = Number(dmState.encounter.turnIndex ?? 0);
  dmState.encounter.combatants ??= [];
  if (!Array.isArray(dmState.encounter.combatants)) dmState.encounter.combatants = [];
  dmState.encounter.notes ??= "";
  dmState.encounter.log ??= [];
  if (!Array.isArray(dmState.encounter.log)) dmState.encounter.log = [];
  dmState.encounter.undoStack ??= [];
  if (!Array.isArray(dmState.encounter.undoStack)) dmState.encounter.undoStack = [];
  dmState.encounter.filters ??= {
    search: "",
    activeOnly: false,
    downOnly: false,
    focusedOnly: false,
    conditionsOnly: false
  };
  dmState.encounter.concentration ??= { byId: {} };
  dmState.encounter.concentration.byId ??= {};
}

function snapshotEncounter() {
  const copy = JSON.parse(JSON.stringify(dmState.encounter));
  delete copy.undoStack;
  return copy;
}

function pushUndoSnapshot(reason = "change") {
  ensureEncounterDefaults();
  dmState.encounter.undoStack.push({
    at: new Date().toISOString(),
    reason,
    state: snapshotEncounter()
  });
  if (dmState.encounter.undoStack.length > 40) {
    dmState.encounter.undoStack.shift();
  }
}

function undoLastChange() {
  ensureEncounterDefaults();
  const prev = dmState.encounter.undoStack.pop();
  if (!prev?.state) return false;
  const keepUndo = dmState.encounter.undoStack;
  dmState.encounter = { ...prev.state, undoStack: keepUndo };
  ensureEncounterDefaults();
  const notesEl = document.getElementById("dmNotes");
  if (notesEl) notesEl.value = dmState.encounter.notes ?? "";
  pushEncounterLog(`Undo applied (${prev.reason})`);
  renderEncounterCards();
  renderEncounterLibrary();
  renderEncounterLog();
  renderEncounterSummary();
  return true;
}

function getTemplates() {
  return JSON.parse(localStorage.getItem("encounterTemplates") || "{}");
}

function setTemplates(data) {
  localStorage.setItem("encounterTemplates", JSON.stringify(data));
}

function pushEncounterLog(message) {
  ensureEncounterDefaults();
  const active = activeCombatant();
  dmState.encounter.log.unshift({
    at: new Date().toISOString(),
    round: dmState.encounter.round,
    turn: active?.name ?? "-",
    message
  });
  dmState.encounter.log = dmState.encounter.log.slice(0, 120);
  renderEncounterLog();
}

function renderEncounterLog() {
  const logEl = document.getElementById("dmLogList");
  if (!logEl) return;
  ensureEncounterDefaults();
  if (!dmState.encounter.log.length) {
    logEl.innerHTML = `<div class="muted">No log entries yet.</div>`;
    return;
  }
  logEl.innerHTML = dmState.encounter.log
    .map(
      e =>
        `<div class="library-item"><span class="library-name">R${e.round} - ${e.turn}: ${e.message}</span></div>`
    )
    .join("");
}

/* =========================
   INIT (ONLY THING THAT RUNS)
========================= */
export async function initDMView() {
  if (initialized) return;
  initialized = true;

  console.log("DM View initialized");

  // Guard: DM view must exist
  const dmViewEl = document.getElementById("dmView");
  if (!dmViewEl) {
    console.warn("dmView not found; aborting DM init");
    return;
  }

  // Ensure encounter baseline exists
  ensureEncounterDefaults();

  // Load monster data once (NO top-level await!)
  await loadMonsters();

  // Cache DOM refs (ONLY inside init)
  encounterNameInputEl = document.getElementById("encounterName");
  monsterSelectEl = document.getElementById("monsterSelect");

  // Populate monster dropdown
  if (monsterSelectEl) {
    monsterSelectEl.innerHTML = "";
    monsters.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = m.title;
      monsterSelectEl.appendChild(opt);
    });
  }

  // Encounter name wiring
  if (encounterNameInputEl) {
    encounterNameInputEl.value = dmState.encounter.name ?? "";
    encounterNameInputEl.addEventListener("input", e => {
      dmState.encounter.name = e.target.value.trim();
    });
  }

  // Button wiring (ONLY inside init)
  bindAddMonster();
  bindAddManualCombatant();
  bindAddPartyMember();
  bindTurnFlow();
  bindEncounterTools();
  bindEncounterNotesAndLog();
  bindFilterControls();
  bindTemplateControls();
  bindSaveLoadExportImport();
  bindLibraryControls();

  // Initial DM render (ONLY inside init)
  renderEncounterCards();
  renderEncounterLibrary();
  renderEncounterLog();
  renderEncounterSummary();
  renderTemplateOptions();
  renderPartyProfileOptions();
}

/* =========================
   BINDINGS
========================= */
function bindAddMonster() {
  const btn = document.getElementById("addMonsterBtn");
  if (!btn || !monsterSelectEl) return;

  btn.addEventListener("click", () => {
    const monster = monsters[Number(monsterSelectEl.value)];
    if (!monster) return;

    const baseName = monster.title;

    const count =
      dmState.encounter.combatants.filter(c => c.name.startsWith(baseName))
        .length + 1;

    const rolledHp = rollHpFromMonster(monster);

    pushUndoSnapshot("add monster");
    dmState.encounter.combatants.push({
      id: crypto.randomUUID(),
      name: `${baseName} #${count}`,
      ac: extractMonsterAC(monster),
      initiative: 0,
      hp: {
        max: rolledHp,
        current: rolledHp,
        temp: 0
      },
      conditions: [],
      monsterRef: monster
    });

    pushEncounterLog(`Added ${baseName} #${count}`);
    renderEncounterCards();
  });
}

function bindAddManualCombatant() {
  const btn = document.getElementById("addCombatantBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const name = document.getElementById("addName")?.value.trim();
    const ac = Number(document.getElementById("addAC")?.value || 0);
    const maxHp = Number(document.getElementById("addHP")?.value || 0);
    const init = Number(document.getElementById("addInit")?.value || 0);

    if (!name || !maxHp) return;

    dmState.encounter.combatants.push({
      id: crypto.randomUUID(),
      name,
      ac,
      initiative: init,
      hp: {
        max: maxHp,
        current: maxHp,
        temp: 0
      },
      conditions: []
    });

    dmState.encounter.combatants.sort((a, b) => b.initiative - a.initiative);
    dmState.encounter.turnIndex = 0;

    pushEncounterLog(`Added ${name} (Init ${init || 0})`);
    renderEncounterCards();
  });
}

function readCharacterProfiles() {
  try {
    const raw = localStorage.getItem("characterProfilesV1") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function renderPartyProfileOptions() {
  const select = document.getElementById("partyProfileSelect");
  if (!select) return;
  const profiles = readCharacterProfiles();
  select.innerHTML = `<option value="">— Select profile —</option>`;
  profiles.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${p.name || "Unnamed"} (Lv ${p.level || 1} ${p.className || ""})`;
    select.appendChild(opt);
  });
}

function bindAddPartyMember() {
  const btn = document.getElementById("addPartyBtn");
  const select = document.getElementById("partyProfileSelect");
  if (!btn || !select) return;
  btn.onclick = () => {
    const idx = Number(select.value);
    if (!Number.isFinite(idx)) return;
    const profiles = readCharacterProfiles();
    const profile = profiles[idx];
    const data = profile?.data;
    if (!data) return;

    const dex = Number(data.abilities?.dex ?? 10);
    const init = Math.floor((dex - 10) / 2);
    const ac = Number(data.combat?.armorClass ?? 10);
    const hpMax = Number(data.hp?.max ?? 1);
    const hpCurrent = Number(data.hp?.current ?? hpMax);
    const name = data.name || profile.name || "Party Member";

    pushUndoSnapshot("add party member");
    pushUndoSnapshot("add combatant");
    dmState.encounter.combatants.push({
      id: crypto.randomUUID(),
      name,
      ac,
      initiative: init,
      hp: { max: hpMax, current: Math.max(0, hpCurrent), temp: Number(data.hp?.temp ?? 0) },
      conditions: [],
      isParty: true,
      sourceProfileId: profile.id ?? null
    });
    pushEncounterLog(`Added party member: ${name}`);
    renderEncounterCards();
  };
}

function bindTurnFlow() {
  const prevBtn = document.getElementById("prevTurnBtn");
  const nextBtn = document.getElementById("nextTurnBtn");
  const newRoundBtn = document.getElementById("newRoundBtn");

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (dmState.encounter.combatants.length === 0) return;
      pushUndoSnapshot("previous turn");
      dmState.encounter.turnIndex--;
      if (dmState.encounter.turnIndex < 0) {
        dmState.encounter.turnIndex = dmState.encounter.combatants.length - 1;
        dmState.encounter.round = Math.max(1, dmState.encounter.round - 1);
      }
      pushEncounterLog("Moved to previous turn");
      renderEncounterCards();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (dmState.encounter.combatants.length === 0) return;
      pushUndoSnapshot("next turn");

      dmState.encounter.turnIndex++;

      if (dmState.encounter.turnIndex >= dmState.encounter.combatants.length) {
        dmState.encounter.turnIndex = 0;
        dmState.encounter.round++;
      }

      pushEncounterLog("Advanced turn");
      renderEncounterCards();
    };
  }

  if (newRoundBtn) {
    newRoundBtn.onclick = () => {
      pushUndoSnapshot("new round");
      dmState.encounter.round++;
      dmState.encounter.turnIndex = 0;

      dmState.encounter.combatants.forEach(c => {
        if (c.legendary) c.legendary.remaining = c.legendary.max;
      });
      applyRoundTick();

      pushEncounterLog("Started new round");
      renderEncounterCards();
    };
  }
}

function bindEncounterTools() {
  const bulkBtn = document.getElementById("bulkInitBtn");
  const sortBtn = document.getElementById("sortInitBtn");
  const clearBtn = document.getElementById("clearDefeatedBtn");
  const undoBtn = document.getElementById("undoDmBtn");
  if (bulkBtn) {
    bulkBtn.onclick = () => {
      pushUndoSnapshot("bulk initiative");
      dmState.encounter.combatants.forEach(c => {
        if (c.monsterRef) c.initiative = rollInitiativeForCombatant(c);
      });
      dmState.encounter.combatants.sort(
        (a, b) => Number(b.initiative || 0) - Number(a.initiative || 0)
      );
      dmState.encounter.turnIndex = 0;
      pushEncounterLog("Rolled initiative for monsters");
      renderEncounterCards();
    };
  }
  if (sortBtn) {
    sortBtn.onclick = () => {
      pushUndoSnapshot("sort initiative");
      dmState.encounter.combatants.sort(
        (a, b) => Number(b.initiative || 0) - Number(a.initiative || 0)
      );
      dmState.encounter.turnIndex = 0;
      pushEncounterLog("Sorted combatants by initiative");
      renderEncounterCards();
    };
  }
  if (clearBtn) {
    clearBtn.onclick = () => {
      pushUndoSnapshot("clear defeated");
      const before = dmState.encounter.combatants.length;
      dmState.encounter.combatants = dmState.encounter.combatants.filter(
        c => Number(c.hp?.current ?? 0) > 0
      );
      dmState.encounter.turnIndex = 0;
      const removed = before - dmState.encounter.combatants.length;
      if (removed > 0) pushEncounterLog(`Cleared ${removed} defeated combatant(s)`);
      renderEncounterCards();
    };
  }
  if (undoBtn) {
    undoBtn.onclick = () => {
      if (!undoLastChange()) {
        pushEncounterLog("Undo requested but no snapshots available");
      }
    };
  }
}

function bindEncounterNotesAndLog() {
  const notesEl = document.getElementById("dmNotes");
  const clearLogBtn = document.getElementById("clearDmLogBtn");
  if (notesEl) {
    notesEl.value = dmState.encounter.notes ?? "";
    notesEl.addEventListener("input", e => {
      dmState.encounter.notes = e.target.value;
    });
  }
  if (clearLogBtn) {
    clearLogBtn.onclick = () => {
      dmState.encounter.log = [];
      renderEncounterLog();
    };
  }
}

function bindFilterControls() {
  const searchEl = document.getElementById("dmSearchInput");
  const activeEl = document.getElementById("dmFilterActive");
  const downEl = document.getElementById("dmFilterDown");
  const focusedEl = document.getElementById("dmFilterFocused");
  const conditionsEl = document.getElementById("dmFilterConditions");

  const sync = () => {
    dmState.encounter.filters.search = (searchEl?.value || "").trim().toLowerCase();
    dmState.encounter.filters.activeOnly = !!activeEl?.checked;
    dmState.encounter.filters.downOnly = !!downEl?.checked;
    dmState.encounter.filters.focusedOnly = !!focusedEl?.checked;
    dmState.encounter.filters.conditionsOnly = !!conditionsEl?.checked;
    renderEncounterCards();
  };

  if (searchEl) {
    searchEl.value = dmState.encounter.filters.search || "";
    searchEl.addEventListener("input", sync);
  }
  if (activeEl) {
    activeEl.checked = !!dmState.encounter.filters.activeOnly;
    activeEl.addEventListener("change", sync);
  }
  if (downEl) {
    downEl.checked = !!dmState.encounter.filters.downOnly;
    downEl.addEventListener("change", sync);
  }
  if (focusedEl) {
    focusedEl.checked = !!dmState.encounter.filters.focusedOnly;
    focusedEl.addEventListener("change", sync);
  }
  if (conditionsEl) {
    conditionsEl.checked = !!dmState.encounter.filters.conditionsOnly;
    conditionsEl.addEventListener("change", sync);
  }
}

function renderTemplateOptions() {
  const select = document.getElementById("templateSelect");
  if (!select) return;
  const templates = getTemplates();
  select.innerHTML = `<option value="">— Select template —</option>`;
  Object.entries(templates).forEach(([slug, tpl]) => {
    const opt = document.createElement("option");
    opt.value = slug;
    opt.textContent = tpl.name || slug;
    select.appendChild(opt);
  });
}

function bindTemplateControls() {
  const saveBtn = document.getElementById("saveTemplateBtn");
  const applyBtn = document.getElementById("applyTemplateBtn");
  const nameInput = document.getElementById("dmTemplateName");
  const select = document.getElementById("templateSelect");
  const scaleInput = document.getElementById("templateScaleInput");

  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = nameInput?.value.trim() || dmState.encounter.name || "Encounter Template";
      const slug = slugify(name);
      const templates = getTemplates();
      templates[slug] = buildEncounterSaveData();
      templates[slug].name = name;
      setTemplates(templates);
      renderTemplateOptions();
      if (nameInput) nameInput.value = "";
      pushEncounterLog(`Saved template: ${name}`);
    };
  }

  if (applyBtn && select) {
    applyBtn.onclick = () => {
      const key = select.value;
      if (!key) return;
      const templates = getTemplates();
      const template = templates[key];
      if (!template) return;
      const scale = Math.max(1, Number(scaleInput?.value || 1));
      pushUndoSnapshot("apply template");
      loadEncounterFromData(template);

      if (scale > 1) {
        const scaled = [];
        dmState.encounter.combatants.forEach(c => {
          if (!c.monsterRef) {
            scaled.push(c);
            return;
          }
          for (let i = 0; i < scale; i += 1) {
            const rolledHp = rollHpFromMonster(c.monsterRef);
            scaled.push({
              ...c,
              id: crypto.randomUUID(),
              name: `${c.monsterRef.title} #${i + 1}`,
              hp: { max: rolledHp, current: rolledHp, temp: 0 },
              conditions: [],
              conditionDurations: {},
              recharge: {}
            });
          }
        });
        dmState.encounter.combatants = scaled;
      }

      dmState.encounter.turnIndex = 0;
      pushEncounterLog(`Applied template: ${template.name || key} (scale ${scale})`);
      renderEncounterCards();
    };
  }
}

function bindSaveLoadExportImport() {
  const saveBtn = document.getElementById("saveEncounterBtn");
  const loadBtn = document.getElementById("loadEncounterBtn");
  const exportBtn = document.getElementById("exportEncounterBtn");
  const importInput = document.getElementById("importEncounterInput");

  if (saveBtn) {
    saveBtn.onclick = () => {
      const data = buildEncounterSaveData();
      localStorage.setItem("savedEncounter", JSON.stringify(data));
      alert("Encounter saved!");
    };
  }

  if (loadBtn) {
    loadBtn.onclick = () => {
      const raw = localStorage.getItem("savedEncounter");
      if (!raw) {
        alert("No saved encounter found");
        return;
      }
      const data = JSON.parse(raw);
      loadEncounterFromData(data);
      renderEncounterCards();
    };
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      const data = buildEncounterSaveData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.name || "encounter")
        .replace(/[^a-z0-9]+/gi, "_")
        .toLowerCase()}.encounter.json`;

      a.click();
      URL.revokeObjectURL(url);
    };
  }

  if (importInput) {
    importInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          loadEncounterFromData(data);
          renderEncounterCards();
        } catch (err) {
          alert("Invalid encounter file");
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
  }
}

function bindLibraryControls() {
  const saveToLibraryBtn = document.getElementById("saveToLibraryBtn");
  const newEncounterBtn = document.getElementById("newEncounterBtn");

  if (saveToLibraryBtn) {
    saveToLibraryBtn.onclick = () => {
      const name = dmState.encounter.name || "Unnamed Encounter";
      const slug = slugify(name);

      const lib = getLibrary();
      lib[slug] = buildEncounterSaveData();

      setLibrary(lib);
      renderEncounterLibrary();
    };
  }

  if (newEncounterBtn) {
    newEncounterBtn.onclick = () => {
      dmState.encounter = {
        name: "New Encounter",
        round: 1,
        turnIndex: 0,
        combatants: [],
        notes: "",
        log: [],
        filters: {
          search: "",
          activeOnly: false,
          downOnly: false,
          focusedOnly: false,
          conditionsOnly: false
        },
        undoStack: []
      };

      if (encounterNameInputEl) encounterNameInputEl.value = dmState.encounter.name;
      const notesEl = document.getElementById("dmNotes");
      if (notesEl) notesEl.value = "";
      const searchEl = document.getElementById("dmSearchInput");
      const activeEl = document.getElementById("dmFilterActive");
      const downEl = document.getElementById("dmFilterDown");
      const focusedEl = document.getElementById("dmFilterFocused");
      const conditionsEl = document.getElementById("dmFilterConditions");
      if (searchEl) searchEl.value = "";
      if (activeEl) activeEl.checked = false;
      if (downEl) downEl.checked = false;
      if (focusedEl) focusedEl.checked = false;
      if (conditionsEl) conditionsEl.checked = false;

      renderEncounterCards();
      renderEncounterLibrary();
      renderEncounterLog();
    };
  }
}

function buildEncounterSaveData() {
  return {
    version: 1,
    name: dmState.encounter.name ?? "Unnamed Encounter",
    round: dmState.encounter.round,
    turnIndex: dmState.encounter.turnIndex,
    notes: dmState.encounter.notes ?? "",
    log: dmState.encounter.log ?? [],
    filters: dmState.encounter.filters ?? {},
    combatants: dmState.encounter.combatants.map(c => ({
      id: c.id,
      name: c.name,
      ac: c.ac,
      initiative: c.initiative,
      hp: c.hp,
      conditions: c.conditions,
      conditionDurations: c.conditionDurations,
      concentration: c.concentration,
      isParty: !!c.isParty,
      monsterId: c.monsterRef?.title ?? null,
      ui: c.ui,
      recharge: c.recharge,
      legendary: c.legendary
    }))
  };
}

function loadEncounterFromData(data) {
  ensureEncounterDefaults();
  dmState.encounter.name = data.name ?? "Loaded Encounter";
  if (encounterNameInputEl) encounterNameInputEl.value = dmState.encounter.name;

  dmState.encounter.round = data.round ?? 1;
  dmState.encounter.turnIndex = data.turnIndex ?? 0;
  dmState.encounter.notes = data.notes ?? "";
  dmState.encounter.log = Array.isArray(data.log) ? data.log : [];
  dmState.encounter.filters = { ...(dmState.encounter.filters || {}), ...(data.filters || {}) };
  const notesEl = document.getElementById("dmNotes");
  if (notesEl) notesEl.value = dmState.encounter.notes;

  dmState.encounter.combatants = (data.combatants ?? []).map(c => {
    const monster = c.monsterId ? monsters.find(m => m.title === c.monsterId) : null;
    return { ...c, monsterRef: monster };
  });
  dmState.encounter.combatants.forEach(normalizeCombatantState);
  const searchEl = document.getElementById("dmSearchInput");
  const activeEl = document.getElementById("dmFilterActive");
  const downEl = document.getElementById("dmFilterDown");
  const focusedEl = document.getElementById("dmFilterFocused");
  const conditionsEl = document.getElementById("dmFilterConditions");
  if (searchEl) searchEl.value = dmState.encounter.filters.search || "";
  if (activeEl) activeEl.checked = !!dmState.encounter.filters.activeOnly;
  if (downEl) downEl.checked = !!dmState.encounter.filters.downOnly;
  if (focusedEl) focusedEl.checked = !!dmState.encounter.filters.focusedOnly;
  if (conditionsEl) conditionsEl.checked = !!dmState.encounter.filters.conditionsOnly;
  renderEncounterLog();
}

/* =========================
   HELPERS (UNCHANGED)
========================= */
function activeCombatant() {
  return dmState.encounter.combatants[dmState.encounter.turnIndex];
}

function extractMonsterAC(monster) {
  const acLine = monster.contents.find(c =>
    c.startsWith("property | Armor class")
  );
  if (!acLine) return 10;

  const match = acLine.match(/\|\s*(\d+)/);
  return match ? Number(match[1]) : 10;
}

function extractLegendaryMax(monster) {
  const line = monster.contents.find(l =>
    l.startsWith("text |") && l.includes("Legendary Action")
  );
  if (!line) return 3;

  const match = line.match(/(\d+)/);
  return match ? Number(match[1]) : 3;
}

function parseRecharge(name) {
  const match = name.match(/Recharge\s*(\d)[â€“-](\d)/i);
  if (!match) return null;

  return {
    min: Number(match[1]),
    max: Number(match[2])
  };
}

let draggedCombatantId = null;

function getLibrary() {
  return JSON.parse(localStorage.getItem("encounterLibrary") || "{}");
}

function setLibrary(lib) {
  localStorage.setItem("encounterLibrary", JSON.stringify(lib));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/* =========================
   TRAIT EXTRACTOR
========================= */
function extractTraits(monster) {
  const traits = [];

  for (const line of monster.contents) {
    if (line.startsWith("section | Actions")) break;

    if (line.startsWith("description |")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        const name = parts[1];
        const text = parts.slice(2).join(" | ");
        traits.push({ name, text });
      }
    }
  }

  return traits;
}

/* =========================
   MONSTER STAT EXTRACTORS
========================= */
function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function extractAbilityScores(monster) {
  const line = monster.contents.find(c => c.startsWith("dndstats"));
  if (!line) return null;

  const parts = line.split("|").map(s => s.trim());
  const scores = parts.slice(1).map(Number);
  if (scores.length !== 6) return null;

  const [str, dex, con, int, wis, cha] = scores;
  return { str, dex, con, int, wis, cha };
}

function extractSpeed(monster) {
  const line = monster.contents.find(c =>
    c.startsWith("property | Speed")
  );
  if (!line) return "â€”";
  return line.split("|").pop().trim();
}

/* =========================
   HP ROLLING
========================= */
function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

function rollHpFromMonster(monster) {
  const hpLine = monster.contents.find(c =>
    c.startsWith("property | Hit points")
  );
  if (!hpLine) return 1;

  const diceMatch = hpLine.match(/(\d+)d(\d+)\s*\+\s*(\d+)/);

  if (!diceMatch) {
    const flat = hpLine.match(/\|\s*(\d+)/);
    return flat ? Number(flat[1]) : 1;
  }

  const [, diceCount, diceSides, bonus] = diceMatch.map(Number);
  return rollDice(diceCount, diceSides) + bonus;
}

function rollInitiativeForCombatant(c) {
  const abilities =
    c.monsterRef ? extractAbilityScores(c.monsterRef) : null;
  const dex = abilities?.dex ?? 10;
  const mod = Math.floor((dex - 10) / 2);
  return Math.floor(Math.random() * 20) + 1 + mod;
}

function normalizeCombatantState(c) {
  c.conditions ??= [];
  c.conditionDurations ??= {};
  c.ui ??= {
    traits: true,
    actions: true,
    bonus: false,
    reactions: false,
    legendary: true,
    focused: false
  };
  c.recharge ??= {};
  c.concentration ??= { active: false, spell: "" };
}

function parseDiceExpressions(text) {
  const matches = String(text || "").match(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/gi);
  return matches ? [...new Set(matches)] : [];
}

function rollExpression(expr) {
  const clean = String(expr).replace(/\s+/g, "");
  const m = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  const count = Number(m[1]);
  const sides = Number(m[2]);
  const mod = Number(m[3] || 0);
  if (!count || !sides) return null;
  const rolls = [];
  for (let i = 0; i < count; i += 1) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return { rolls, total, mod };
}

function decorateDiceInText(text) {
  return String(text || "").replace(
    /\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/gi,
    `<button class="inline-dice-btn" data-roll="$1">$1</button>`
  );
}

function applyRoundTick() {
  dmState.encounter.combatants.forEach(c => {
    normalizeCombatantState(c);
    c.conditions = c.conditions.filter(cond => {
      const rounds = Number(c.conditionDurations[cond] ?? 0);
      if (rounds > 0) {
        const next = rounds - 1;
        c.conditionDurations[cond] = next;
        if (next <= 0) {
          delete c.conditionDurations[cond];
          pushEncounterLog(`${c.name} condition expired: ${cond}`);
          return false;
        }
      }
      return true;
    });
  });
}

function matchesFilters(c, index) {
  const f = dmState.encounter.filters || {};
  if (f.search) {
    const q = f.search.toLowerCase();
    if (!String(c.name || "").toLowerCase().includes(q)) return false;
  }
  if (f.activeOnly && index !== dmState.encounter.turnIndex) return false;
  if (f.downOnly && Number(c.hp?.current ?? 0) > 0) return false;
  if (f.focusedOnly && !c.ui?.focused) return false;
  if (f.conditionsOnly && (!Array.isArray(c.conditions) || !c.conditions.length)) return false;
  return true;
}

function renderEncounterSummary() {
  const aliveEl = document.getElementById("dmAliveCount");
  const downEl = document.getElementById("dmDownCount");
  const hpEl = document.getElementById("dmTotalHp");
  const hpMaxEl = document.getElementById("dmTotalHpMax");
  const concEl = document.getElementById("dmConcentrationCount");
  if (!aliveEl || !downEl || !hpEl || !hpMaxEl || !concEl) return;

  const combatants = dmState.encounter.combatants ?? [];
  let alive = 0;
  let down = 0;
  let concentrationCount = 0;
  let hpTotal = 0;
  let hpMaxTotal = 0;

  combatants.forEach(c => {
    normalizeCombatantState(c);
    const current = Number(c.hp?.current ?? 0);
    const max = Number(c.hp?.max ?? 0);
    if (!c.isParty) {
      hpTotal += current;
      hpMaxTotal += max;
    }
    if (current > 0) alive += 1;
    else down += 1;
    if (c.concentration?.active) concentrationCount += 1;
  });

  aliveEl.textContent = String(alive);
  downEl.textContent = String(down);
  hpEl.textContent = String(hpTotal);
  hpMaxEl.textContent = String(hpMaxTotal);
  concEl.textContent = String(concentrationCount);
}

/* =========================
   CARD RENDERER (FULL)
========================= */
function renderEncounterCards() {
  const roundEl = document.getElementById("dmRound");
  const turnEl = document.getElementById("dmTurn");

  if (roundEl) roundEl.textContent = dmState.encounter.round;
  if (turnEl) turnEl.textContent = activeCombatant()?.name ?? "â€”";
  renderEncounterSummary();

  const mount = document.getElementById("encounterCards");
  if (!mount) return;

  mount.innerHTML = "";

  dmState.encounter.combatants.forEach((c, i) => {
    normalizeCombatantState(c);
    if (!matchesFilters(c, i)) return;

    const card = document.createElement("div");
    card.className = "monster-card";
    card.draggable = true;
    if (c.ui?.focused) card.classList.add("focused");
    card.dataset.combatantId = c.id;
    if (Number(c.hp?.current ?? 0) <= 0) card.classList.add("down");

    card.addEventListener("dragstart", () => {
      draggedCombatantId = c.id;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      draggedCombatantId = null;
      card.classList.remove("dragging");
    });

    card.addEventListener("dragover", e => {
      e.preventDefault();
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("drag-over");

      if (!draggedCombatantId || draggedCombatantId === c.id) return;

      const list = dmState.encounter.combatants;
      const fromIndex = list.findIndex(x => x.id === draggedCombatantId);
      const toIndex = list.findIndex(x => x.id === c.id);

      if (fromIndex === -1 || toIndex === -1) return;

      pushUndoSnapshot("reorder initiative");
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);

      // Reordered stack sets turn flow to start from the top card.
      dmState.encounter.turnIndex = 0;
      pushEncounterLog("Reordered initiative stack");

      renderEncounterCards();
    });

    if (i === dmState.encounter.turnIndex) card.classList.add("active");

    card.innerHTML = `
      <header class="card-header drag-handle">
        <div>
          <h3>${c.name}</h3>
          <div class="card-sub">
            AC ${c.ac} • Init <input class="init-input" type="number" value="${Number(c.initiative ?? 0)}" />
          </div>
        </div>

        <div class="card-hp">
          <strong>HP ${c.hp.current}/${c.hp.max}</strong>
          <button data-d="-5">-5</button>
          <button data-d="-1">-</button>
          <button data-d="1">+</button>
          <button data-d="5">+5</button>
        </div>
      </header>

      <div class="card-controls">
        <button class="set-active-btn">Set Turn</button>
        <button class="focus-combatant-btn">${c.ui?.focused ? "Unfocus" : "Focus"}</button>
        <input class="quick-hp-input" type="text" placeholder="-12 / +8" />
        <button class="apply-quick-hp-btn">Apply</button>
        <input class="conc-input" type="text" placeholder="Concentration spell" value="${c.concentration?.spell || ""}" />
        <button class="toggle-conc-btn">${c.concentration?.active ? "End Conc." : "Start Conc."}</button>
        <button class="remove-combatant-btn">Remove</button>
      </div>

      <section class="card-body"></section>
    `;

    // HP controls
    card.querySelectorAll(".card-hp button").forEach(btn => {
      btn.onclick = () => {
        pushUndoSnapshot("hp adjust");
        const before = c.hp.current;
        c.hp.current = Math.max(
          0,
          Math.min(c.hp.max, c.hp.current + Number(btn.dataset.d))
        );
        if (before !== c.hp.current) {
          pushEncounterLog(`${c.name} HP ${before} -> ${c.hp.current}`);
        }
        renderEncounterCards();
      };
    });

    const initInput = card.querySelector(".init-input");
    if (initInput) {
      initInput.addEventListener("change", e => {
        pushUndoSnapshot("initiative edit");
        c.initiative = Number(e.target.value || 0);
        pushEncounterLog(`${c.name} initiative set to ${c.initiative}`);
      });
    }

    const setActiveBtn = card.querySelector(".set-active-btn");
    if (setActiveBtn) {
      setActiveBtn.onclick = () => {
        pushUndoSnapshot("set turn");
        dmState.encounter.turnIndex = i;
        pushEncounterLog(`Turn set to ${c.name}`);
        renderEncounterCards();
      };
    }

    const focusBtn = card.querySelector(".focus-combatant-btn");
    if (focusBtn) {
      focusBtn.onclick = () => {
        pushUndoSnapshot("focus toggle");
        dmState.encounter.combatants.forEach(x => {
          x.ui ??= {};
          x.ui.focused = false;
        });
        c.ui ??= {};
        c.ui.focused = !card.classList.contains("focused");
        pushEncounterLog(`${c.name} ${c.ui.focused ? "marked as focus" : "unfocused"}`);
        renderEncounterCards();
      };
    }

    const removeBtn = card.querySelector(".remove-combatant-btn");
    if (removeBtn) {
      removeBtn.onclick = () => {
        pushUndoSnapshot("remove combatant");
        dmState.encounter.combatants = dmState.encounter.combatants.filter(x => x.id !== c.id);
        dmState.encounter.turnIndex = Math.max(
          0,
          Math.min(dmState.encounter.turnIndex, dmState.encounter.combatants.length - 1)
        );
        pushEncounterLog(`Removed ${c.name}`);
        renderEncounterCards();
      };
    }

    const quickInput = card.querySelector(".quick-hp-input");
    const quickApply = card.querySelector(".apply-quick-hp-btn");
    const applyQuickDelta = () => {
      const raw = (quickInput?.value || "").trim();
      if (!raw) return;
      const delta = Number(raw);
      if (!Number.isFinite(delta)) return;
      pushUndoSnapshot("quick hp");
      const before = c.hp.current;
      c.hp.current = Math.max(0, Math.min(c.hp.max, c.hp.current + delta));
      pushEncounterLog(
        `${c.name} HP ${before} -> ${c.hp.current} (${delta >= 0 ? "+" : ""}${delta})`
      );
      renderEncounterCards();
    };
    if (quickApply) quickApply.onclick = applyQuickDelta;
    if (quickInput) {
      quickInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyQuickDelta();
        }
      });
    }

    const concInput = card.querySelector(".conc-input");
    const concBtn = card.querySelector(".toggle-conc-btn");
    if (concBtn) {
      concBtn.onclick = () => {
        pushUndoSnapshot("concentration toggle");
        c.concentration.active = !c.concentration.active;
        c.concentration.spell = (concInput?.value || c.concentration.spell || "").trim();
        if (c.concentration.active) {
          pushEncounterLog(`${c.name} started concentration${c.concentration.spell ? ` (${c.concentration.spell})` : ""}`);
        } else {
          pushEncounterLog(`${c.name} ended concentration`);
        }
        renderEncounterCards();
      };
    }

    const body = card.querySelector(".card-body");
    let html = "";
    let actions = [];

    // Conditions
    html += `
      <div class="condition-bar">
        ${CONDITIONS.map(cond => `
          <span
            class="condition-chip ${c.conditions.includes(cond) ? "active" : ""}"
            data-cond="${cond}"
            data-tooltip="${CONDITION_RULES[cond]}"
          >
            ${cond}${Number(c.conditionDurations?.[cond] ?? 0) > 0 ? ` (${Number(c.conditionDurations[cond])}r)` : ""}
          </span>
        `).join("")}
      </div>
    `;

    // Monster data blocks
    if (c.monsterRef) {
      const m = c.monsterRef;

      const abilities = extractAbilityScores(m);
      const speed = extractSpeed(m);
      const traits = extractTraits(m);
      actions = extractActions(m);
      const bonus = extractBonusActions(m);
      const reactions = extractReactions(m);
      const legendary = extractLegendaryActions(m);

      if (abilities) {
        html += `
          <div class="ability-row">
            <div>STR ${abilities.str} (${fmtMod(abilities.str)})</div>
            <div>DEX ${abilities.dex} (${fmtMod(abilities.dex)})</div>
            <div>CON ${abilities.con} (${fmtMod(abilities.con)})</div>
            <div>INT ${abilities.int} (${fmtMod(abilities.int)})</div>
            <div>WIS ${abilities.wis} (${fmtMod(abilities.wis)})</div>
            <div>CHA ${abilities.cha} (${fmtMod(abilities.cha)})</div>
          </div>
          <div class="speed-line"><strong>Speed</strong> ${speed}</div>
        `;
      }

      if (traits.length) {
        html += sectionBlock("traits", "Traits", traits.map(t =>
          `<p><strong>${t.name}.</strong> ${t.text}</p>`
        ).join(""), c);
      }

      if (actions.length) {
        html += `
          <div class="quick-action-grid">
            ${actions.slice(0, 5).map((a, idx) => `<button class="quick-action-btn" data-action-idx="${idx}">${a.name}</button>`).join("")}
          </div>
        `;
        html += sectionBlock("actions", "Actions", actions.map(a => {
          const recharge = parseRecharge(a.name);
          const key = a.name;

          if (recharge && !(key in c.recharge)) c.recharge[key] = true;
          const ready = recharge ? c.recharge[key] : true;
          const rolls = parseDiceExpressions(a.text);

          return `
            <p class="${ready ? "" : "recharging"}">
              <strong><em>${a.name}.</em></strong> ${decorateDiceInText(a.text)}
              ${rolls.length ? `<span class="action-roll-hint">Rolls: ${rolls.join(", ")}</span>` : ""}
              ${recharge
                ? `<button class="recharge-btn" data-key="${key}">
                     ${ready ? "Use" : "Roll Recharge"}
                   </button>`
                : ""}
            </p>
          `;
        }).join(""), c);
      }

      if (bonus.length) {
        html += sectionBlock("bonus", "Bonus Actions",
          bonus.map(b =>
            `<p><strong><em>${b.name}.</em></strong> ${decorateDiceInText(b.text)}</p>`
          ).join(""),
          c
        );
      }

      if (reactions.length) {
        html += sectionBlock("reactions", "Reactions",
          reactions.map(r =>
            `<p><strong><em>${r.name}.</em></strong> ${decorateDiceInText(r.text)}</p>`
          ).join(""),
          c
        );
      }

      if (legendary.actions.length) {
        const max = extractLegendaryMax(m);
        c.legendary ??= { max, remaining: max };

        html += `
          <hr class="stat-divider">
          <div class="collapsible">
            <h4 data-sec="legendary">
              Legendary Actions (${c.legendary.remaining}/${c.legendary.max})
              ${c.ui.legendary ? "â–¾" : "â–¸"}
            </h4>
            ${c.ui.legendary ? `
              <div class="section-body">
                ${legendary.intro ? `<p><em>${legendary.intro}</em></p>` : ""}
                <div class="legendary-controls">
                  <button data-cost="1">âˆ’1</button>
                  <button data-cost="2">âˆ’2</button>
                  <button data-cost="3">âˆ’3</button>
                </div>
                ${legendary.actions.map(l =>
                  `<p><strong>${l.name}.</strong> ${decorateDiceInText(l.text)}</p>`
                ).join("")}
              </div>
            ` : ""}
          </div>
        `;
      }
    }

    body.innerHTML = html;

    // Interactions
    body.querySelectorAll(".condition-chip").forEach(chip => {
      chip.onclick = e => {
        const cnd = chip.dataset.cond;
        const idx = c.conditions.indexOf(cnd);
        pushUndoSnapshot("condition toggle");
        if (idx === -1) {
          c.conditions.push(cnd);
          if (e.shiftKey) {
            const rounds = Number(prompt(`Set rounds for ${cnd} (0 for indefinite):`, "0"));
            if (Number.isFinite(rounds) && rounds > 0) c.conditionDurations[cnd] = rounds;
          }
        } else {
          c.conditions.splice(idx, 1);
          delete c.conditionDurations[cnd];
        }
        pushEncounterLog(
          idx === -1
            ? `${c.name} gained condition: ${cnd}`
            : `${c.name} removed condition: ${cnd}`
        );
        renderEncounterCards();
      };
    });

    body.querySelectorAll("h4[data-sec]").forEach(h => {
      h.onclick = () => {
        const k = h.dataset.sec;
        c.ui[k] = !c.ui[k];
        renderEncounterCards();
      };
    });

    body.querySelectorAll(".recharge-btn").forEach(btn => {
      btn.onclick = () => {
        pushUndoSnapshot("recharge roll");
        const key = btn.dataset.key;
        const recharge = parseRecharge(key);
        c.recharge[key]
          ? (c.recharge[key] = false)
          : (Math.ceil(Math.random() * 6) >= recharge.min && (c.recharge[key] = true));
        pushEncounterLog(`${c.name} recharge ${key}: ${c.recharge[key] ? "ready" : "expended"}`);
        renderEncounterCards();
      };
    });

    body.querySelectorAll(".legendary-controls button").forEach(btn => {
      btn.onclick = () => {
        pushUndoSnapshot("legendary spend");
        c.legendary.remaining = Math.max(
          0,
          c.legendary.remaining - Number(btn.dataset.cost)
        );
        pushEncounterLog(`${c.name} spent ${btn.dataset.cost} legendary action point(s)`);
        renderEncounterCards();
      };
    });

    body.querySelectorAll(".quick-action-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.actionIdx);
        const action = actions[idx];
        if (!action) return;
        const rolls = parseDiceExpressions(action.text);
        if (!rolls.length) {
          pushEncounterLog(`${c.name} used action: ${action.name}`);
          return;
        }
        const result = rollExpression(rolls[0]);
        if (!result) return;
        pushEncounterLog(
          `${c.name} ${action.name}: ${rolls[0]} => [${result.rolls.join(", ")}]${result.mod ? ` ${result.mod >= 0 ? "+" : ""}${result.mod}` : ""} = ${result.total}`
        );
      };
    });

    body.querySelectorAll(".inline-dice-btn").forEach(btn => {
      btn.onclick = () => {
        const expr = btn.dataset.roll;
        if (!expr) return;
        const result = rollExpression(expr);
        if (!result) return;
        pushEncounterLog(
          `${c.name} rolled ${expr}: [${result.rolls.join(", ")}]${result.mod ? ` ${result.mod >= 0 ? "+" : ""}${result.mod}` : ""} = ${result.total}`
        );
      };
    });

    mount.appendChild(card);
  });

  const activeId = activeCombatant()?.id ?? null;
  if (activeId && activeId !== lastActiveCombatantId) {
    const activeCard = mount.querySelector(`.monster-card[data-combatant-id="${activeId}"]`);
    activeCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    lastActiveCombatantId = activeId;
  }
}

/* ---------- Helper ---------- */
function sectionBlock(key, title, content, c) {
  return `
    <hr class="stat-divider">
    <div class="collapsible">
      <h4 data-sec="${key}">
        ${title} ${c.ui[key] ? "â–¾" : "â–¸"}
      </h4>
      ${c.ui[key] ? `<div class="section-body">${content}</div>` : ""}
    </div>
  `;
}

/* =========================
   SMALL FORMAT HELPER
========================= */
function fmtMod(score) {
  const mod = Math.floor((score - 10) / 2);
  return `${mod >= 0 ? "+" : ""}${mod}`;
}

/* =========================
   ACTION EXTRACTOR
========================= */
function extractActions(monster) {
  const actions = [];
  let inActions = false;

  for (const line of monster.contents) {
    if (line.startsWith("section | Actions")) {
      inActions = true;
      continue;
    }

    if (inActions && line.startsWith("section |")) break;

    if (inActions && line.startsWith("description |")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        const name = parts[1];
        const text = parts.slice(2).join(" | ");
        actions.push({ name, text });
      }
    }
  }

  return actions;
}

/* =========================
   BONUS ACTION EXTRACTOR
========================= */
function extractBonusActions(monster) {
  const out = [];
  let inSection = false;

  for (const line of monster.contents) {
    if (line.startsWith("section | Bonus Actions")) {
      inSection = true;
      continue;
    }

    if (inSection && line.startsWith("section |")) break;

    if (inSection && line.startsWith("description |")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        out.push({
          name: parts[1],
          text: parts.slice(2).join(" | ")
        });
      }
    }
  }
  return out;
}

/* =========================
   REACTION EXTRACTOR
========================= */
function extractReactions(monster) {
  const out = [];
  let inSection = false;

  for (const line of monster.contents) {
    if (line.startsWith("section | Reactions")) {
      inSection = true;
      continue;
    }

    if (inSection && line.startsWith("section |")) break;

    if (inSection && line.startsWith("description |")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        out.push({
          name: parts[1],
          text: parts.slice(2).join(" | ")
        });
      }
    }
  }
  return out;
}

/* =========================
   LEGENDARY ACTION EXTRACTOR
========================= */
function extractLegendaryActions(monster) {
  const actions = [];
  let intro = null;
  let inSection = false;

  for (const line of monster.contents) {
    if (line.startsWith("section | Legendary Actions")) {
      inSection = true;
      continue;
    }

    if (inSection && line.startsWith("section |")) break;

    if (inSection && line.startsWith("text |")) {
      intro = line.split("|").slice(2).join(" | ").trim();
    }

    if (inSection && line.startsWith("description |")) {
      const parts = line.split("|").map(s => s.trim());
      if (parts.length >= 3) {
        actions.push({
          name: parts[1],
          text: parts.slice(2).join(" | ")
        });
      }
    }
  }

  return { intro, actions };
}

/* =========================
   LIBRARY RENDER
========================= */
function renderEncounterLibrary() {
  const list = document.getElementById("encounterList");
  if (!list) return;

  const lib = getLibrary();
  list.innerHTML = "";

  Object.entries(lib).forEach(([slug, enc]) => {
    const row = document.createElement("div");
    row.className = "library-item";

    const name = document.createElement("span");
    name.textContent = enc.name;
    name.className = "library-name";
    name.onclick = () => {
      loadEncounterFromData(enc);
      renderEncounterCards();
    };

    const del = document.createElement("button");
    del.textContent = "âœ–";
    del.className = "library-delete";
    del.title = "Delete encounter";

    del.onclick = e => {
      e.stopPropagation();
      if (!confirm(`Delete "${enc.name}"? This cannot be undone.`)) return;

      const lib2 = getLibrary();
      delete lib2[slug];
      setLibrary(lib2);
      renderEncounterLibrary();
    };

    row.appendChild(name);
    row.appendChild(del);
    list.appendChild(row);
  });
}


