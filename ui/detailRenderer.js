import { openSpellDetail } from "./spellDetailModal.js";
import { getSpellById } from "../engine/lookups/spellLookup.js";

function make(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function prettyType(type) {
  const map = {
    class: "Class",
    subclass: "Subclass",
    race: "Race",
    background: "Background"
  };
  return map[type] || "Detail";
}

function addKeyValueList(sectionBody, rows) {
  const list = make("div", "detail-kv-list");
  rows.forEach(({ key, value }) => {
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return;
    const row = make("div", "detail-kv-row");
    row.append(make("span", "detail-kv-key", key));
    const val = make("span", "detail-kv-value");
    val.textContent = Array.isArray(value) ? value.join(", ") : String(value);
    row.append(val);
    list.append(row);
  });
  if (list.children.length) sectionBody.append(list);
}

function section(mount, title) {
  const wrap = make("section", "detail-section");
  wrap.append(make("h2", "detail-section-title", title));
  const body = make("div", "detail-section-body");
  wrap.append(body);
  mount.append(wrap);
  return body;
}

function renderSpellTable(tableData) {
  const table = make("table", "detail-table");
  const head = make("thead");
  const headerRow = make("tr");

  const firstVal = tableData && Object.values(tableData)[0];
  const isSlots = Array.isArray(firstVal);
  const headers = isSlots
    ? ["Level", "Cantrips", "1st", "2nd", "3rd", "4th", "5th"]
    : ["Level", "Always Prepared Spells"];

  headers.forEach(h => headerRow.append(make("th", "", h)));
  head.append(headerRow);
  table.append(head);

  const body = make("tbody");
  Object.entries(tableData || {}).forEach(([level, value]) => {
    const tr = make("tr");
    tr.append(make("td", "", level));
    if (isSlots) {
      value.forEach(v => tr.append(make("td", "", v == null || v === 0 ? "-" : String(v))));
    } else {
      const td = make("td");
      (value || []).forEach((spellId, i) => {
        const spell = getSpellById(spellId);
        if (!spell) return;
        const link = make("button", "detail-inline-link", spell.title);
        link.type = "button";
        link.onclick = () => openSpellDetail(spell);
        td.append(link);
        if (i < value.length - 1) td.append(document.createTextNode(", "));
      });
      tr.append(td);
    }
    body.append(tr);
  });
  table.append(body);
  return table;
}

function renderRaceContents(body, race) {
  const lines = Array.isArray(race.contents) ? race.contents : [];
  lines.forEach(line => {
    if (!line || line === "rule") {
      body.append(make("hr", "detail-divider"));
      return;
    }

    const parts = String(line).split("|").map(p => p.trim());
    const kind = String(parts[0] || "").toLowerCase();

    if (kind === "property" && parts.length >= 3) {
      const card = make("article", "detail-item");
      card.append(make("h3", "detail-item-title", parts[1]));
      card.append(make("p", "detail-item-text", parts.slice(2).join(" | ")));
      body.append(card);
      return;
    }

    if ((kind === "race trait" || kind === "description") && parts.length >= 3) {
      const card = make("article", "detail-item");
      card.append(make("h3", "detail-item-title", parts[1]));
      card.append(make("p", "detail-item-text", parts.slice(2).join(" | ")));
      body.append(card);
      return;
    }

    if (kind === "bullet" && parts.length >= 2) {
      const p = make("p", "detail-bullet");
      p.innerHTML = parts.slice(1).join(" | ");
      body.append(p);
      return;
    }

    const fallback = make("p", "detail-item-text", String(line));
    body.append(fallback);
  });
}

function renderClassDetail(mount, data) {
  const overview = section(mount, "Overview");
  addKeyValueList(overview, [
    { key: "Hit Die", value: data.hitDie ? `d${data.hitDie}` : null },
    { key: "Primary Ability", value: data.primaryAbility?.toUpperCase() },
    { key: "Saving Throws", value: data.savingThrows?.map(s => s.toUpperCase()) }
  ]);
  if (data.description) overview.append(make("p", "detail-lead", data.description));

  if (data.proficiencies) {
    const prof = section(mount, "Proficiencies");
    addKeyValueList(prof, [
      { key: "Armor", value: data.proficiencies.armor || [] },
      { key: "Weapons", value: data.proficiencies.weapons || [] },
      { key: "Tools", value: data.proficiencies.tools || [] }
    ]);
  }

  if (data.spellcasting) {
    const spellcasting = section(mount, "Spellcasting");
    addKeyValueList(spellcasting, [
      { key: "Caster Type", value: data.spellcasting.type },
      { key: "Ability", value: data.spellcasting.ability?.toUpperCase() },
      { key: "Preparation", value: data.spellcasting.preparation || null }
    ]);
    if (data.spellcasting.description) {
      spellcasting.append(make("p", "detail-item-text", data.spellcasting.description));
    }
  }

  if (data.ui?.showSpellTable && data.id) {
    const slots = section(mount, "Spell Slots");
    fetch(`./data/spellSlots/${data.id}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(tableData => {
        if (!tableData) {
          slots.append(make("p", "detail-muted", "Spell slot table missing."));
          return;
        }
        slots.append(renderSpellTable(tableData));
      })
      .catch(() => slots.append(make("p", "detail-muted", "Spell slot table missing.")));
  }

  if (data.levels) {
    const timeline = section(mount, "Features by Level");
    Object.keys(data.levels)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(level => {
        const lvlWrap = make("article", "detail-level-block");
        lvlWrap.append(make("h3", "detail-level-title", `Level ${level}`));

        const lvl = data.levels[level];
        if (lvl.subclass?.label) {
          lvlWrap.append(make("p", "detail-item-text", lvl.subclass.label));
        }

        (lvl.features || []).forEach(feature => {
          const item = make("div", "detail-item");
          item.append(make("h4", "detail-item-title", feature.name || "Feature"));
          item.append(make("p", "detail-item-text", feature.description || ""));
          lvlWrap.append(item);
        });
        timeline.append(lvlWrap);
      });
  }
}

function renderSubclassDetail(mount, data) {
  const overview = section(mount, "Overview");
  addKeyValueList(overview, [
    { key: "Class", value: data.classId || null },
    { key: "Source", value: data.source || null }
  ]);
  if (data.description) overview.append(make("p", "detail-lead", data.description));

  const features = section(mount, "Subclass Features");
  Object.keys(data.featuresByLevel || {})
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(level => {
      const lvlWrap = make("article", "detail-level-block");
      lvlWrap.append(make("h3", "detail-level-title", `Level ${level}`));
      (data.featuresByLevel[level] || []).forEach(feature => {
        const item = make("div", "detail-item");
        item.append(make("h4", "detail-item-title", feature.name || "Feature"));
        item.append(make("p", "detail-item-text", feature.description || ""));
        if (feature.type === "spell-table" && feature.spells) {
          item.append(renderSpellTable(feature.spells));
        }
        lvlWrap.append(item);
      });
      features.append(lvlWrap);
    });
}

function renderBackgroundDetail(mount, data) {
  const overview = section(mount, "Overview");
  addKeyValueList(overview, [
    { key: "Source", value: data.source || null },
    { key: "Feat", value: data.feat || null },
    { key: "Skill Proficiencies", value: data.skillProficiencies || [] },
    { key: "Tool Proficiencies", value: data.toolProficiencies || [] }
  ]);

  if (Array.isArray(data.equipmentOptions) && data.equipmentOptions.length) {
    const eq = section(mount, "Equipment Options");
    data.equipmentOptions.forEach(line => eq.append(make("p", "detail-item-text", line)));
  }

  if (Array.isArray(data.features) && data.features.length) {
    const feats = section(mount, "Background Features");
    data.features.forEach(feature => {
      const item = make("article", "detail-item");
      item.append(make("h3", "detail-item-title", feature.name || "Feature"));
      item.append(make("p", "detail-item-text", feature.description || ""));
      feats.append(item);
    });
  }
}

function renderRaceDetail(mount, data) {
  const overview = section(mount, "Overview");
  addKeyValueList(overview, [
    { key: "Source", value: data.source || null }
  ]);
  const content = section(mount, "Race Details");
  renderRaceContents(content, data);
}

export function renderDetail(type, data, mount) {
  mount.innerHTML = "";
  const shell = make("div", "detail-shell");

  const top = make("div", "detail-topbar");
  const back = make("button", "detail-back-btn", "Back to Sheet");
  back.type = "button";
  back.onclick = () => window.dispatchEvent(new Event("close-detail"));
  const badge = make("span", "detail-type-pill", prettyType(type));
  top.append(back, badge);

  const hero = make("header", "detail-hero");
  hero.append(make("h1", "detail-title", data.name || data.title || "Detail"));
  if (data.shortDescription) hero.append(make("p", "detail-lead", data.shortDescription));
  else if (data.description) hero.append(make("p", "detail-lead", data.description));

  const content = make("div", "detail-content");

  shell.append(top, hero, content);
  mount.append(shell);

  if (type === "class") renderClassDetail(content, data);
  else if (type === "subclass") renderSubclassDetail(content, data);
  else if (type === "background") renderBackgroundDetail(content, data);
  else if (type === "race") renderRaceDetail(content, data);
  else {
    const fallback = section(content, "Details");
    fallback.append(make("p", "detail-muted", "No renderer available for this detail type."));
  }
}
