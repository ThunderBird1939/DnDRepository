import { character } from "../data/character.js";

let cachedTechniques = null;

async function loadTechniques() {
  if (cachedTechniques) return cachedTechniques;

  const res = await fetch("./data/manifest/manifest-techniques.json");
  if (!res.ok) {
    console.error("Failed to load manifest techniques");
    return [];
  }

  cachedTechniques = await res.json();
  return cachedTechniques;
}

function techniqueIsAvailable(tech) {
  // Universal techniques always show
  if (tech.tags?.includes("universal")) return true;

  // Disposition-gated
  if (!character.disposition) return false;
  return tech.tags?.includes(`disposition:${character.disposition}`);
}

export async function renderManifestTechniques() {
  const panel = document.getElementById("manifestTechniquesPanel");
  const list = document.getElementById("manifestTechniquesList");

  if (!panel || !list) return;

  // Only Bound Vanguard at level 2+
  if (character.class?.id !== "bound-vanguard" || character.level < 2) {
    panel.hidden = true;
    list.innerHTML = "";
    return;
  }

  panel.hidden = false;

  const techniques = await loadTechniques();

  list.innerHTML = "";

  const available = techniques.filter(tech => {
    if (tech.tags?.includes("universal")) return true;
    if (!character.disposition) return false;
    return tech.tags.includes(`disposition:${character.disposition}`);
  });

  if (available.length === 0) {
    list.innerHTML = "<p class='hint'>No techniques available.</p>";
    return;
  }

  for (const tech of available) {
    const el = document.createElement("div");
    el.className = "feature manifest-technique";

    el.innerHTML = `
      <h4>
        ${tech.name}
        <span class="cost">ME ${tech.cost}</span>
      </h4>

      <div class="tech-meta">
        ${tech.type ? `<span>${tech.type}</span>` : ""}
        ${tech.trigger ? `<span>Trigger: ${tech.trigger}</span>` : ""}
        ${tech.range ? `<span>Range: ${tech.range}</span>` : ""}
        ${tech.area ? `<span>Area: ${tech.area}</span>` : ""}
        ${tech.duration ? `<span>Duration: ${tech.duration}</span>` : ""}
        ${tech.limit ? `<span>Limit: ${tech.limit}</span>` : ""}
      </div>

      <p>${tech.effect ?? tech.description ?? ""}</p>

      ${
        tech.options
          ? `<ul>${tech.options.map(o => `<li>${o}</li>`).join("")}</ul>`
          : ""
      }

      ${
        tech.scaling
          ? `<small class="scaling">Scaling: ${Object.values(tech.scaling).join(", ")}</small>`
          : ""
      }
    `;

    list.appendChild(el);
  }
}

