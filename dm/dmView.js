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
    "A blinded creature can’t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.",
  Charmed:
    "A charmed creature can’t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on ability checks to interact socially with the creature.",
  Deafened:
    "A deafened creature can’t hear and automatically fails any ability check that requires hearing.",
  Frightened:
    "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can’t willingly move closer to the source of its fear.",
  Grappled:
    "A grappled creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.",
  Incapacitated:
    "An incapacitated creature can’t take actions or reactions.",
  Invisible:
    "An invisible creature is impossible to see without the aid of magic or a special sense. Attack rolls against the creature have disadvantage, and the creature’s attack rolls have advantage.",
  Paralyzed:
    "A paralyzed creature is incapacitated and can’t move or speak. Attack rolls against the creature have advantage, and any attack that hits is a critical hit if the attacker is within 5 feet.",
  Petrified:
    "A petrified creature is transformed into stone, is incapacitated, and unaware of its surroundings. The creature has resistance to all damage.",
  Poisoned:
    "A poisoned creature has disadvantage on attack rolls and ability checks.",
  Prone:
    "A prone creature’s only movement option is to crawl. The creature has disadvantage on attack rolls, and attack rolls against it have advantage if the attacker is within 5 feet.",
  Restrained:
    "A restrained creature’s speed becomes 0. Attack rolls against the creature have advantage, and the creature’s attack rolls have disadvantage.",
  Stunned:
    "A stunned creature is incapacitated, can’t move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws.",
  Unconscious:
    "An unconscious creature is incapacitated, prone, and unaware of its surroundings. Attack rolls against the creature have advantage, and any hit within 5 feet is a critical hit."
};

/* =========================
   MODULE-SCOPED UI REFS
========================= */
let initialized = false;

let encounterNameInputEl = null;
let monsterSelectEl = null;

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
  dmState.encounter ??= {
    name: "New Encounter",
    round: 1,
    turnIndex: 0,
    combatants: []
  };

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
  bindTurnFlow();
  bindSaveLoadExportImport();
  bindLibraryControls();

  // Initial DM render (ONLY inside init)
  renderEncounterCards();
  renderEncounterLibrary();
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

    renderEncounterCards();
  });
}

function bindTurnFlow() {
  const nextBtn = document.getElementById("nextTurnBtn");
  const newRoundBtn = document.getElementById("newRoundBtn");

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (dmState.encounter.combatants.length === 0) return;

      dmState.encounter.turnIndex++;

      if (dmState.encounter.turnIndex >= dmState.encounter.combatants.length) {
        dmState.encounter.turnIndex = 0;
        dmState.encounter.round++;
      }

      renderEncounterCards();
    };
  }

  if (newRoundBtn) {
    newRoundBtn.onclick = () => {
      dmState.encounter.round++;
      dmState.encounter.turnIndex = 0;

      dmState.encounter.combatants.forEach(c => {
        if (c.legendary) c.legendary.remaining = c.legendary.max;
      });

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
        combatants: []
      };

      if (encounterNameInputEl) encounterNameInputEl.value = dmState.encounter.name;

      renderEncounterCards();
      renderEncounterLibrary();
    };
  }
}

function buildEncounterSaveData() {
  return {
    version: 1,
    name: dmState.encounter.name ?? "Unnamed Encounter",
    round: dmState.encounter.round,
    turnIndex: dmState.encounter.turnIndex,
    combatants: dmState.encounter.combatants.map(c => ({
      id: c.id,
      name: c.name,
      ac: c.ac,
      initiative: c.initiative,
      hp: c.hp,
      conditions: c.conditions,
      monsterId: c.monsterRef?.title ?? null,
      ui: c.ui,
      recharge: c.recharge,
      legendary: c.legendary
    }))
  };
}

function loadEncounterFromData(data) {
  dmState.encounter.name = data.name ?? "Loaded Encounter";
  if (encounterNameInputEl) encounterNameInputEl.value = dmState.encounter.name;

  dmState.encounter.round = data.round ?? 1;
  dmState.encounter.turnIndex = data.turnIndex ?? 0;

  dmState.encounter.combatants = (data.combatants ?? []).map(c => {
    const monster = c.monsterId ? monsters.find(m => m.title === c.monsterId) : null;
    return { ...c, monsterRef: monster };
  });
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
  const match = name.match(/Recharge\s*(\d)[–-](\d)/i);
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
  if (!line) return "—";
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

/* =========================
   CARD RENDERER (FULL)
========================= */
function renderEncounterCards() {
  const roundEl = document.getElementById("dmRound");
  const turnEl = document.getElementById("dmTurn");

  if (roundEl) roundEl.textContent = dmState.encounter.round;
  if (turnEl) turnEl.textContent = activeCombatant()?.name ?? "—";

  const mount = document.getElementById("encounterCards");
  if (!mount) return;

  mount.innerHTML = "";

  dmState.encounter.combatants.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "monster-card";
    card.draggable = true;

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

      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);

      // Fix turn index
      if (dmState.encounter.turnIndex === fromIndex) {
        dmState.encounter.turnIndex = toIndex;
      } else if (
        fromIndex < dmState.encounter.turnIndex &&
        toIndex >= dmState.encounter.turnIndex
      ) {
        dmState.encounter.turnIndex--;
      } else if (
        fromIndex > dmState.encounter.turnIndex &&
        toIndex <= dmState.encounter.turnIndex
      ) {
        dmState.encounter.turnIndex++;
      }

      renderEncounterCards();
    });

    if (i === dmState.encounter.turnIndex) card.classList.add("active");

    // State defaults
    c.conditions ??= [];
    c.ui ??= {
      traits: true,
      actions: true,
      bonus: false,
      reactions: false,
      legendary: true
    };
    c.recharge ??= {};

    card.innerHTML = `
      <header class="card-header drag-handle">
        <div>
          <h3>${c.name}</h3>
          <div class="card-sub">
            AC ${c.ac} • Init ${c.initiative}
          </div>
        </div>

        <div class="card-hp">
          <strong>HP ${c.hp.current}/${c.hp.max}</strong>
          <button data-d="-5">−5</button>
          <button data-d="-1">−</button>
          <button data-d="1">+</button>
          <button data-d="5">+5</button>
        </div>
      </header>

      <section class="card-body"></section>
    `;

    // HP controls
    card.querySelectorAll(".card-hp button").forEach(btn => {
      btn.onclick = () => {
        c.hp.current = Math.max(
          0,
          Math.min(c.hp.max, c.hp.current + Number(btn.dataset.d))
        );
        renderEncounterCards();
      };
    });

    const body = card.querySelector(".card-body");
    let html = "";

    // Conditions
    html += `
      <div class="condition-bar">
        ${CONDITIONS.map(cond => `
          <span
            class="condition-chip ${c.conditions.includes(cond) ? "active" : ""}"
            data-cond="${cond}"
            data-tooltip="${CONDITION_RULES[cond]}"
          >
            ${cond}
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
      const actions = extractActions(m);
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
        html += sectionBlock("actions", "Actions", actions.map(a => {
          const recharge = parseRecharge(a.name);
          const key = a.name;

          if (recharge && !(key in c.recharge)) c.recharge[key] = true;
          const ready = recharge ? c.recharge[key] : true;

          return `
            <p class="${ready ? "" : "recharging"}">
              <strong><em>${a.name}.</em></strong> ${a.text}
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
            `<p><strong><em>${b.name}.</em></strong> ${b.text}</p>`
          ).join(""),
          c
        );
      }

      if (reactions.length) {
        html += sectionBlock("reactions", "Reactions",
          reactions.map(r =>
            `<p><strong><em>${r.name}.</em></strong> ${r.text}</p>`
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
              ${c.ui.legendary ? "▾" : "▸"}
            </h4>
            ${c.ui.legendary ? `
              <div class="section-body">
                ${legendary.intro ? `<p><em>${legendary.intro}</em></p>` : ""}
                <div class="legendary-controls">
                  <button data-cost="1">−1</button>
                  <button data-cost="2">−2</button>
                  <button data-cost="3">−3</button>
                </div>
                ${legendary.actions.map(l =>
                  `<p><strong>${l.name}.</strong> ${l.text}</p>`
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
      chip.onclick = () => {
        const cnd = chip.dataset.cond;
        const idx = c.conditions.indexOf(cnd);
        idx === -1 ? c.conditions.push(cnd) : c.conditions.splice(idx, 1);
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
        const key = btn.dataset.key;
        const recharge = parseRecharge(key);
        c.recharge[key]
          ? (c.recharge[key] = false)
          : (Math.ceil(Math.random() * 6) >= recharge.min && (c.recharge[key] = true));
        renderEncounterCards();
      };
    });

    body.querySelectorAll(".legendary-controls button").forEach(btn => {
      btn.onclick = () => {
        c.legendary.remaining = Math.max(
          0,
          c.legendary.remaining - Number(btn.dataset.cost)
        );
        renderEncounterCards();
      };
    });

    mount.appendChild(card);
  });
}

/* ---------- Helper ---------- */
function sectionBlock(key, title, content, c) {
  return `
    <hr class="stat-divider">
    <div class="collapsible">
      <h4 data-sec="${key}">
        ${title} ${c.ui[key] ? "▾" : "▸"}
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
    del.textContent = "✖";
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
