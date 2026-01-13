/* =========================
   Remove Background
   Reverts all background-granted effects
========================= */

export function removeBackground(character) {
  if (!character.background?.id) return;

  /* =========================
     FEATURES
  ========================= */
  character.features = character.features.filter(
    f => f.source !== "background"
  );

  /* =========================
     SKILLS
  ========================= */
  // Rebuild skills excluding background-granted ones
  if (character._backgroundSkills) {
    character._backgroundSkills.forEach(skill => {
      character.proficiencies.skills.delete(skill);
    });
    delete character._backgroundSkills;
  }

  /* =========================
     TOOLS
  ========================= */
  if (character._backgroundTools) {
    character._backgroundTools.forEach(tool => {
      character.proficiencies.tools.delete(tool);
    });
    delete character._backgroundTools;
  }

  /* =========================
     LANGUAGES
  ========================= */
  if (character._backgroundLanguages) {
    character._backgroundLanguages.forEach(lang => {
      character.proficiencies.languages.delete(lang);
    });
    delete character._backgroundLanguages;
  }

  /* =========================
     VEHICLES
  ========================= */
  if (character._backgroundVehicles) {
    character._backgroundVehicles.forEach(v => {
      character.proficiencies.vehicles.delete(v);
    });
    delete character._backgroundVehicles;
  }

  /* =========================
     INVENTORY
  ========================= */
  if (character.inventory) {
    character.inventory = character.inventory.filter(
      item => item.source !== "background"
    );
  }

  /* =========================
     RESET STATE
  ========================= */
  character.background = { id: null, name: null, source: null };
  character.resolvedChoices.background = false;

  // Clear any pending background-driven choices
  if (character.pendingChoices?.languages?.source === "background") {
    character.pendingChoices.languages = null;
  }

  if (character.pendingChoices?.tools?.source === "background") {
    character.pendingChoices.tools = null;
  }
}
