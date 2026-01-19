import { character } from "../data/character.js";

let weaponChoices = null;

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = await res.text();
  if (!text.trim()) return [];
  return JSON.parse(text);
}

export async function initWeaponAndSpellSelects() {
  const weaponsSelect = document.getElementById("weaponsSelect");
  if (!weaponsSelect) return;

  if (!weaponChoices) {
    const weapons = await loadJson("./data/weapons.all.json");

    weaponsSelect.innerHTML = "";

    weapons.forEach(w => {
      const opt = document.createElement("option");

      const id = w.title.toLowerCase().replace(/\s+/g, "-");

      opt.value = id;
      opt.textContent = w.title;

      weaponsSelect.appendChild(opt);
    });

    weaponChoices = new Choices(weaponsSelect, {
      removeItemButton: true,
      searchEnabled: true,
      placeholder: true,
      placeholderValue: "Select weapons..."
    });

    weaponsSelect.addEventListener("change", () => {
      character.weapons = Array.from(
        weaponsSelect.selectedOptions
      ).map(o => o.value);

      window.dispatchEvent(new Event("weapons-changed"));
    });
  }
}

