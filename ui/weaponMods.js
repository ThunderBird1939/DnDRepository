let modsData = null;

/* =========================
   LOAD MOD DATA (CACHED)
========================= */
async function loadWeaponMods() {
  if (modsData) return modsData;

  const [basic, advanced, legendary] = await Promise.all([
    fetch("./data/gunblade/basic.mods.json").then(r => r.json()),
    fetch("./data/gunblade/advanced.mods.json").then(r => r.json()),
    fetch("./data/gunblade/legendary.mods.json").then(r => r.json())
  ]);

  modsData = {
    basic,
    advanced,
    legendary
  };

  return modsData;
}

/* =========================
   PUBLIC ENTRY POINT
========================= */
export async function renderWeaponMods(character) {
  if (character.class?.id !== "ostrumite-gunner") return;

  const panel = document.getElementById("weaponModsPanel");
  if (!panel) return;

  character.mods ??= {};
  const mods = character.mods;

  // 🔑 Load mod data once
  modsData = await loadWeaponMods();

  panel.hidden = false;

  /* =========================
     MOD USAGE DISPLAY
  ========================= */
  const slots = ["blade", "edge", "core", "barrel", "frame"];
  const usedSlots = slots.filter(s => mods[s]).length;
  const hasLegendary = !!mods.legendary;

  document.getElementById("modsUsed").textContent =
    hasLegendary
      ? `${usedSlots} / ${slots.length} (+1 Legendary)`
      : `${usedSlots} / ${slots.length}`;

  /* =========================
     RENDER SLOT DROPDOWNS
  ========================= */
  panel.querySelectorAll("select[data-slot]").forEach(select => {
    const slot = select.dataset.slot;
    renderSlotDropdown(select, slot, character, mods);
  });

  /* =========================
     RENDER LEGENDARY
  ========================= */
  renderLegendaryDropdown(character, mods);

  /* =========================
     INVENTORY (DERIVED)
  ========================= */
  renderModInventory(mods);
}

/* =========================
   SLOT RENDERING
========================= */
function renderSlotDropdown(select, slot, character, mods) {
  select.innerHTML = "";
  select.disabled = false;

  select.appendChild(new Option("— Empty —", ""));

  const tierData = [
    ...(modsData.basic.categories[slot]?.basic ?? []).map(m => ({
      ...m,
      tier: "basic"
    })),
    ...(modsData.advanced.categories[slot]?.advanced ?? []).map(m => ({
      ...m,
      tier: "advanced"
    }))
  ];


  tierData
    .filter(mod => isModAllowed(mod, character))
    .forEach(mod => {
      select.appendChild(new Option(mod.name, mod.id));
    });

  if (mods[slot]) {
    select.value = mods[slot];
  }

  select.onchange = () => {
    mods[slot] = select.value || null;
    renderWeaponMods(character);
  };
}

/* =========================
   LEGENDARY DROPDOWN
========================= */
function renderLegendaryDropdown(character, mods) {
  const select = document.getElementById("legendaryModSelect");
  if (!select) return;

  select.innerHTML = "";
  select.appendChild(new Option("— None —", ""));

  Object.values(modsData.legendary.categories)
    .flatMap(c => c.legendary)
    .forEach(mod => {
      select.appendChild(new Option(mod.name, mod.id));
    });

  if (mods.legendary) {
    select.value = mods.legendary;
  }

  select.onchange = () => {
    mods.legendary = select.value || null;
    renderWeaponMods(character);
  };
}

/* =========================
   INVENTORY (DERIVED)
========================= */
function renderModInventory(mods) {
  const ul = document.getElementById("gunModInventory");
  if (!ul) return;

  ul.innerHTML = "";

  const equipped = new Set(
    Object.values(mods).filter(Boolean)
  );

  const allMods = [
    ...Object.values(modsData.basic.categories).flatMap(c => c.basic),
    ...Object.values(modsData.advanced.categories).flatMap(c => c.advanced),
    ...Object.values(modsData.legendary.categories).flatMap(c => c.legendary)
  ];

  allMods
    .filter(mod => !equipped.has(mod.id))
    .forEach(mod => {
      const li = document.createElement("li");
      li.textContent = mod.name;
      ul.appendChild(li);
    });
}

/* =========================
   RULE CHECKS
========================= */
function isModAllowed(mod, character) {
  if (mod.tier === "advanced" && character.level < 9) return false;
  return true;
}
