import { character } from "../data/character.js";
import {
  artificerPrepLimit,
  wizardPrepLimit,
  spellIdFromTitle,
  spellLevelFromTags,
  isCantripFromTags
} from "../engine/rules/spellPrepRules.js";

const PREP_CLASSES = new Set(["artificer", "wizard", "cleric", "druid", "paladin", "ranger"]);
const KNOWN_ONLY_CLASSES = new Set(["wizard", "artificer"]);

function abilityMod(score = 10) {
  return Math.floor((score - 10) / 2);
}

function genericPrepLimit() {
  const classId = character.class?.id;
  const level = Number(character.level ?? 1);
  const castingAbility = character.spellcasting?.ability ?? "wis";
  const castingMod = abilityMod(character.abilities?.[castingAbility] ?? 10);

  if (classId === "cleric" || classId === "druid") {
    return Math.max(1, castingMod + level);
  }

  if (classId === "paladin" || classId === "ranger") {
    return Math.max(1, castingMod + Math.floor(level / 2));
  }

  return 0;
}

export async function renderPreparedSpells() {
  const container = document.getElementById("preparedSpells");
  const section = container?.closest(".prepared-spells");
  if (!container) return;

  container.innerHTML = "";

  if (!character.spellcasting?.enabled || !character.class?.id) {
    if (section) section.hidden = true;
    container.textContent = "—";
    return;
  }

  if (!PREP_CLASSES.has(character.class.id)) {
    if (section) section.hidden = true;
    const className = character.class?.name || "This class";
    container.textContent = `${className} does not prepare spells.`;
    return;
  }
  if (section) section.hidden = false;

  character.spellcasting.prepared ??= new Set();
  character.spellcasting.alwaysPrepared ??= new Set();
  character.spellcasting.available ??= new Set();

  const alwaysPrepared = character.spellcasting.alwaysPrepared;

  const limit =
    character.class.id === "wizard"
      ? wizardPrepLimit(character)
      : character.class.id === "artificer"
        ? artificerPrepLimit(character)
        : genericPrepLimit();

  const maxLevel =
    character.spellcasting?.slotsPerLevel
      ?.map((n, i) => (n > 0 ? i + 1 : null))
      .filter(Boolean)
      .pop() ?? 0;

  const res = await fetch(`./data/spells/${character.class.id}.json`);
  if (!res.ok) {
    container.textContent = "Spell data missing.";
    return;
  }

  const spells = await res.json();

  let sourceSpells = spells;
  if (KNOWN_ONLY_CLASSES.has(character.class.id)) {
    const knownPool = character.spellcasting.available ?? new Set();
    sourceSpells = spells.filter(spell =>
      knownPool.has(spellIdFromTitle(spell.title))
    );
  }

  const allowedSpellIds = new Set(
    sourceSpells
      .filter(spell => !isCantripFromTags(spell.tags))
      .filter(spell => {
        const level = spellLevelFromTags(spell.tags);
        return level && level <= maxLevel;
      })
      .map(spell => spellIdFromTitle(spell.title))
  );

  // Strict gate: only eligible known/available spells can remain prepared.
  character.spellcasting.prepared = new Set(
    [...character.spellcasting.prepared].filter(
      id => allowedSpellIds.has(id) && !alwaysPrepared.has(id)
    )
  );
  const prepared = character.spellcasting.prepared;

  if (prepared.size > limit) {
    character.spellcasting.prepared = new Set(
      [...prepared].slice(0, limit)
    );
  }

  const currentPrepared = character.spellcasting.prepared;

  const header = document.createElement("p");
  header.innerHTML = `<strong>${currentPrepared.size} / ${limit}</strong> prepared`;
  container.appendChild(header);

  sourceSpells.forEach(spell => {
    const id = spellIdFromTitle(spell.title);

    if (isCantripFromTags(spell.tags)) return;

    const level = spellLevelFromTags(spell.tags);
    if (!level || level > maxLevel) return;

    if (alwaysPrepared.has(id)) return;

    const label = document.createElement("label");
    label.style.display = "block";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = currentPrepared.has(id);

    if (!cb.checked && currentPrepared.size >= limit) {
      cb.disabled = true;
    }

    cb.onchange = () => {
      if (cb.checked) {
        if (currentPrepared.size >= limit) {
          cb.checked = false;
          return;
        }
        currentPrepared.add(id);
      } else {
        currentPrepared.delete(id);
      }

      renderPreparedSpells();
      window.dispatchEvent(new Event("prepared-spells-updated"));
    };

    label.appendChild(cb);
    label.append(` ${spell.title}`);
    container.appendChild(label);
  });
}
