let modsData = null;

/* =========================
   LOAD MOD DATA (CACHED)
========================= */
async function loadWeaponMods() {
  if (modsData) return modsData;

  const res = await fetch(
    "./data/ostrumite/mods/ostrumite-gunblade-mods.json"
  );
  modsData = await res.json();
  return modsData;
}

/* =========================
   PUBLIC ENTRY POINT
========================= */
export async function renderWeaponMods(character) {
  if (character.class?.id !== "ostrumite-gunner") return;

  const panel = document.getElementById("weaponModsPanel");
  if (!panel) return;

  const weapon = character.weapons?.primary;
  if (!weapon || !weapon.installedMods) return;

  // 🔑 Load mod data once
  modsData = await loadWeaponMods();
  if (!modsData?.mods) return;

  panel.hidden = false;

  // Capacity display
  const used = Object.values(weapon.installedMods).filter(Boolean).length;
  document.getElementById("modsUsed").textContent = used;
  document.getElementById("modsMax").textContent = weapon.modCapacity ?? 0;

  // Render each slot dropdown
  panel.querySelectorAll("select[data-slot]").forEach(select => {
    const slot = select.dataset.slot;
    renderSlotDropdown(select, slot, character, weapon);
  });

  // 🔽 Render inventory (derived)
  renderModInventory(weapon);
}

/* =========================
   SLOT RENDERING
========================= */
function renderSlotDropdown(select, slot, character, weapon) {
  select.innerHTML = "";

  // Slot lock rules
  if (slot === "blade" && character.level < 3) {
    select.appendChild(new Option("— Locked —", ""));
    select.disabled = true;
    return;
  }

  select.disabled = false;

  // Empty option
  select.appendChild(new Option("— Empty —", ""));

  // Eligible mods
  modsData.mods
    .filter(mod => mod.slot === slot)
    .filter(mod => isModAllowed(mod, character))
    .forEach(mod => {
      select.appendChild(new Option(mod.name, mod.id));
    });

  // Current installed mod
  const installed = weapon.installedMods[slot];
  if (installed) {
    select.value = installed.id;
  }

  select.onchange = () => {
    applyModChange(character, weapon, slot, select.value);
  };
}

/* =========================
   APPLY / REMOVE MOD
========================= */
function applyModChange(character, weapon, slot, modId) {
  const currentUsed =
    Object.values(weapon.installedMods).filter(Boolean).length;

  // Remove mod
  if (!modId) {
    weapon.installedMods[slot] = null;
    renderWeaponMods(character);
    return;
  }

  // Capacity check
  if (!weapon.installedMods[slot] && currentUsed >= weapon.modCapacity) {
    alert("This weapon cannot hold more mods.");
    renderWeaponMods(character);
    return;
  }

  const mod = modsData.mods.find(m => m.id === modId);
  weapon.installedMods[slot] = mod;

  renderWeaponMods(character);
}

/* =========================
   INVENTORY (DERIVED)
========================= */
function renderModInventory(weapon) {
  const ul = document.getElementById("gunModInventory");
  if (!ul) return;

  ul.innerHTML = "";

  const installedIds = new Set(
    Object.values(weapon.installedMods)
      .filter(Boolean)
      .map(m => m.id)
  );

  modsData.mods
    .filter(mod => !installedIds.has(mod.id))
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
  if (mod.tier === "legendary") return false;

  if (mod.subclass && mod.subclass !== character.subclass?.id) {
    return false;
  }

  return true;
}
