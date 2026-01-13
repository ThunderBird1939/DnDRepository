/* =========================
   Background Card Parser
   Converts rpg-cards background entries
   into engine-usable data
========================= */

function normalizeId(str) {
  return str
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function extractAfterColon(line) {
  return line.split("</b>").pop().trim();
}

function splitList(text) {
  return text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function parseLanguages(text) {
  const lower = text.toLowerCase();

  if (lower.includes("two of your choice")) {
    return { choose: 2 };
  }

  if (lower.includes("one of your choice")) {
    return { choose: 1 };
  }

  // Explicit list (Elvish, Gnomish, etc.)
  return {
    fixed: splitList(text).map(normalizeId)
  };
}

function parseEquipment(text) {
  // Strip gold info into readable inventory entries
  return splitList(
    text.replace(/\band\b/gi, ",")
  );
}

function parseFeature(line) {
  // description | Feature: City Secrets | You know the secret patterns...
  const [, rest] = line.split("Feature:");
  const [name, ...descParts] = rest.split("|");

  return {
    id: normalizeId(name),
    name: name.trim(),
    description: descParts.join("|").trim()
  };
}
function detectChoice(text) {
  const lower = text.toLowerCase();

  if (lower.includes("gaming set")) {
    return { type: "tools", category: "gaming", choose: 1 };
  }

  if (lower.includes("musical instrument")) {
    return { type: "tools", category: "musical", choose: 1 };
  }

  if (lower.includes("artisan")) {
    return { type: "tools", category: "artisan", choose: 1 };
  }

  if (lower.includes("two languages")) {
    return { type: "languages", choose: 2 };
  }

  if (lower.includes("one language")) {
    return { type: "languages", choose: 1 };
  }

  if (lower.includes("vehicles (land)")) {
    return { type: "vehicles", value: "land" };
  }

  if (lower.includes("vehicles (water)")) {
    return { type: "vehicles", value: "water" };
  }

  return null;
}

/* =========================
   MAIN PARSER
========================= */

export function parseBackgroundCard(card) {
  const parsed = {
    id: normalizeId(card.title),
    name: card.title,

    skills: [],
    tools: [],
    languages: null,
    equipment: [],
    features: [],
    choices: []
  };

  for (const line of card.contents) {
    /* =========================
       SKILLS
    ========================= */
    if (line.includes("<b>Skill Proficiencies:</b>")) {
      parsed.skills = splitList(
        extractAfterColon(line)
      ).map(normalizeId);
    }

    /* =========================
       TOOLS
    ========================= */
    if (line.includes("<b>Tool Proficiencies:</b>")) {
    const text = extractAfterColon(line);
    const choice = detectChoice(text);

    if (choice) {
        parsed.choices.push(choice);
    } else {
        parsed.tools = splitList(text).map(normalizeId);
    }
    }


    /* =========================
       LANGUAGES
    ========================= */
    if (line.includes("<b>Languages:</b>")) {
    const text = extractAfterColon(line);
    const choice = detectChoice(text);

    if (choice) {
        parsed.choices.push(choice);
    } else {
        parsed.languages = parseLanguages(text);
    }
    }


    /* =========================
       EQUIPMENT
    ========================= */
    if (line.includes("<b>Equipment:</b>")) {
    const text = extractAfterColon(line);
    const choice = detectChoice(text);

    if (choice) {
        parsed.choices.push(choice);
    } else {
        parsed.equipment = parseEquipment(text);
    }
    }

    /* =========================
       FEATURES
    ========================= */
    if (line.startsWith("description | Feature:")) {
      parsed.features.push(parseFeature(line));
    }
  }

  return parsed;
}
