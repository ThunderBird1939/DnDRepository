/* =========================
   Apply Background
   Applies parsed background data
   to the character ONCE
========================= */

export function applyBackground(character, bg) {
  if (!bg || character.resolvedChoices.background) return;

  /* =========================
     BACKGROUND IDENTITY
  ========================= */
  character.background = {
    id: bg.id,
    name: bg.name,
    source: "background"
  };

  /* =========================
     SKILL PROFICIENCIES
  ========================= */
    character._backgroundSkills = new Set();

    bg.skills?.forEach(skill => {
    character.proficiencies.skills.add(skill);
    character._backgroundSkills.add(skill);
    });


  /* =========================
     TOOL PROFICIENCIES
  ========================= */
    character._backgroundTools = new Set();

    bg.tools?.forEach(tool => {
    character.proficiencies.tools.add(tool);
    character._backgroundTools.add(tool);
    });


  /* =========================
     LANGUAGES
  ========================= */
  if (bg.languages) {
    if (bg.languages.choose) {
      character.pendingChoices.languages = {
        choose: bg.languages.choose,
        source: "background"
      };
    }

    if (bg.languages.fixed) {
      bg.languages.fixed.forEach(lang => {
        character.proficiencies.languages?.add?.(lang);
      });
    }
  }
    /* =========================
        BACKGROUND CHOICES
    ========================= */
    bg.choices?.forEach(choice => {
        // Language choices (modal)
        if (choice.type === "languages") {
        character.pendingChoices.languages = {
            choose: choice.choose,
            source: "background"
        };
        }

        // Tool category choices (artisan / gaming / musical)
        if (choice.type === "tools") {
        character.pendingChoices.tools = {
            choose: choice.choose,
            category: choice.category,
            source: "background"
        };
        }

        // Vehicle proficiencies (immediate)
        if (choice.type === "vehicles") {
        character.proficiencies.vehicles.add(choice.value);
        }
    });

  /* =========================
     FEATURES
  ========================= */
  bg.features?.forEach(feature => {
    if (!character.features.some(f => f.id === feature.id)) {
      character.features.push({
        ...feature,
        source: "background"
      });
    }
  });

  /* =========================
     EQUIPMENT (INVENTORY)
  ========================= */
  character.inventory ??= [];

  bg.equipment?.forEach(item => {
    character.inventory.push({
      name: item,
      source: "background"
    });
  });

  /* =========================
     LOCK BACKGROUND
  ========================= */
  character.resolvedChoices.background = true;

  /* =========================
     UI SIGNAL
  ========================= */
  window.dispatchEvent(new Event("background-applied"));
}
