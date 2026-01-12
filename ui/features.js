import { character } from "../data/character.js";

function formatSource(source) {
  if (!source) return "";
  return source.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function renderFeatures() {
  const container = document.getElementById("featuresList");
  if (!container) return;

  container.innerHTML = "";

  if (!character.features || character.features.length === 0) {
    container.textContent = "—";
    return;
  }

// 🔍 FILTER: hide generic specialist placeholders once subclass is chosen
const filteredFeatures = character.features.filter(feature => {
  // If no subclass chosen, show everything
  if (!character.subclass) return true;

  // Hide generic artificer specialist placeholders
  if (
    feature.source === "artificer" &&
    feature.type === "specialist-placeholder"
  ) {
    return false;
  }

  return true;
});



  // Sort by level, then name (stable & PDF-friendly)
  const features = [...filteredFeatures].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  features.forEach(feature => {
    const div = document.createElement("div");
    div.className = "feature";

    const title = document.createElement("h4");
    title.textContent = feature.name;

    const meta = document.createElement("small");
    meta.textContent = `Level ${feature.level} — ${formatSource(feature.source)}`;

    div.appendChild(title);
    div.appendChild(meta);

    if (feature.description) {
      const desc = document.createElement("div");
      desc.textContent = feature.description;
      div.appendChild(desc);
    }

    container.appendChild(div);
  });
}
