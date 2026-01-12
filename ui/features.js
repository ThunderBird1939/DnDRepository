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
    if (!character.subclass) return true;

    if (
      feature.source === "artificer" &&
      feature.type === "specialist-placeholder"
    ) {
      return false;
    }

    return true;
  });

  const classId = character.class?.id;
  const subclassId = character.subclass?.id;

  const classFeatures = [];
  const subclassFeatures = [];

  filteredFeatures.forEach(feature => {
    if (feature.source === subclassId) {
      subclassFeatures.push(feature);
    } else {
      classFeatures.push(feature);
    }
  });

  const sortByLevel = (a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  };

  classFeatures.sort(sortByLevel);
  subclassFeatures.sort(sortByLevel);

  if (classFeatures.length) {
    const header = document.createElement("h3");
    header.textContent = "Class Features";
    container.appendChild(header);

    classFeatures.forEach(feature => {
      container.appendChild(renderFeature(feature));
    });
  }

  if (subclassFeatures.length) {
    const header = document.createElement("h3");
    header.textContent = `Subclass Features — ${formatSource(subclassId)}`;
    container.appendChild(header);

    subclassFeatures.forEach(feature => {
      container.appendChild(renderFeature(feature));
    });
  }
}

/* 👇 PUT IT HERE 👇 */
function renderFeature(feature) {
  const div = document.createElement("div");
  div.className = "feature";

  const title = document.createElement("h4");
  title.textContent = feature.name;

  const meta = document.createElement("small");
  meta.textContent = `Level ${feature.level}`;

  div.appendChild(title);
  div.appendChild(meta);

  if (feature.description) {
    const desc = document.createElement("div");
    desc.textContent = feature.description;
    div.appendChild(desc);
  }

  return div;
}
