import { openSpellDetail } from "./spellDetailModal.js";
import { getSpellById } from "../engine/lookups/spellLookup.js"; 

/* =========================
   Helper UI builders (TOP LEVEL)
========================= */
function section(title) {
  const h = document.createElement("h2");
  h.textContent = title;
  return h;
}

function row(label, value) {
  const p = document.createElement("p");
  p.innerHTML = `<strong>${label}:</strong> ${value}`;
  return p;
}

function featureBlock(name, description) {
  const wrap = document.createElement("div");
  wrap.className = "feature-block";

  const h4 = document.createElement("h4");
  h4.textContent = name;

  const p = document.createElement("p");
  p.textContent = description || "";

  wrap.append(h4, p);
  return wrap;
}

/**
 * Renders a table from a "level -> array" object.
 * Used for spell slots OR subclass spell tables.
 *
 * For spell slots: { "1": [2,2,0,0,0,0], ... } (includes cantrips)
 * For subclass spells: { "3": ["healing-word","ray-of-sickness"], ... } (no cantrips)
 */
function renderSpellTable(tableData) {
  const table = document.createElement("table");
  table.className = "spell-table";

  const header = document.createElement("tr");

  // Detect shape
  const firstVal = tableData && Object.values(tableData)[0];
  const isSlots = Array.isArray(firstVal);

  if (isSlots) {
    ["Level", "Cantrips", "1st", "2nd", "3rd", "4th", "5th"].forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      header.appendChild(th);
    });
  } else {
    ["Artificer Level", "Always Prepared Spells"].forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      header.appendChild(th);
    });
  }

  table.appendChild(header);

  Object.entries(tableData || {}).forEach(([level, value]) => {
    const tr = document.createElement("tr");

    const lvl = document.createElement("td");
    lvl.textContent = level;
    tr.appendChild(lvl);

    if (isSlots) {
      // value is [cantrips,1,2,3,4,5]
      value.forEach(v => {
        const td = document.createElement("td");
        td.textContent = v || "—";
        tr.appendChild(td);
      });
    } else {
      // value is ["healing-word", ...]
      const td = document.createElement("td");

      (value || []).forEach((spellId, index) => {
        const spell = getSpellById(spellId);
        if (!spell) return;

        const span = document.createElement("span");
        span.textContent = spell.title;
        span.style.cursor = "pointer";
        span.style.textDecoration = "underline";

        span.onclick = () => openSpellDetail(spell);

        td.appendChild(span);

        if (index < value.length - 1) {
          td.appendChild(document.createTextNode(", "));
        }
      });

      tr.appendChild(td);

    }

    table.appendChild(tr);
  });

  return table;
}

function renderDiceTable(tableData) {
  const table = document.createElement("table");
  table.className = "dice-table";

  const header = document.createElement("tr");
  const th1 = document.createElement("th");
  th1.textContent = tableData.dice;
  const th2 = document.createElement("th");
  th2.textContent = "Effect";
  header.append(th1, th2);
  table.appendChild(header);

  (tableData.rows || []).forEach(r => {
    const tr = document.createElement("tr");

    const roll = document.createElement("td");
    roll.textContent = r.roll;

    const effect = document.createElement("td");
    effect.textContent = r.effect;

    tr.append(roll, effect);
    table.appendChild(tr);
  });

  return table;
}

/* =========================
   Detail Renderer (EXPORT)
========================= */
export function renderDetail(type, data, mount) {
  mount.innerHTML = "";

  // Back
  const back = document.createElement("button");
  back.textContent = "← Back";
  back.onclick = () => history.back();
  mount.appendChild(back);

  // Title
  const title = document.createElement("h1");
  title.textContent = data.name || "Detail";
  mount.appendChild(title);

  // Description
  if (data.description) {
    const desc = document.createElement("p");
    desc.textContent = data.description;
    mount.appendChild(desc);
  }

  /* =========================
     CLASS DETAIL
  ========================= */
  if (type === "class") {
    mount.appendChild(section("Class Features"));

    if (data.hitDie) mount.appendChild(row("Hit Die", `d${data.hitDie}`));
    if (data.primaryAbility) {
      mount.appendChild(row("Primary Ability", data.primaryAbility.toUpperCase()));
    }
    if (data.savingThrows?.length) {
      mount.appendChild(
        row("Saving Throws", data.savingThrows.map(s => s.toUpperCase()).join(", "))
      );
    }

    // Spell slot table
    if (data.ui?.showSpellTable) {
      mount.appendChild(section("Spell Slots per Level"));

      // ✅ use class id, not hardcoded artificer
      fetch(`./data/spellSlots/${data.id}.json`)
        .then(r => r.json())
        .then(tableData => {
          mount.appendChild(renderSpellTable(tableData));
        })
        .catch(() => {
          const p = document.createElement("p");
          p.textContent = "Spell slot table missing.";
          mount.appendChild(p);
        });
    }

    // Proficiencies
    if (data.proficiencies) {
      mount.appendChild(section("Proficiencies"));
      if (data.proficiencies.armor) mount.appendChild(row("Armor", data.proficiencies.armor.join(", ")));
      if (data.proficiencies.weapons) mount.appendChild(row("Weapons", data.proficiencies.weapons.join(", ")));
      if (data.proficiencies.tools) mount.appendChild(row("Tools", data.proficiencies.tools.join(", ")));
    }

    // Spellcasting
    if (data.spellcasting) {
      mount.appendChild(section("Spellcasting"));
      mount.appendChild(row("Caster Type", data.spellcasting.type));
      mount.appendChild(row("Spellcasting Ability", data.spellcasting.ability?.toUpperCase()));

      if (data.spellcasting.description) {
        const p = document.createElement("p");
        p.textContent = data.spellcasting.description;
        mount.appendChild(p);
      }
    }

    // Features by level
    if (data.levels) {
      mount.appendChild(section("Class Features by Level"));

      Object.keys(data.levels)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(level => {
          const h3 = document.createElement("h3");
          h3.textContent = `Level ${level}`;
          mount.appendChild(h3);

          // Subclass links (if the class defines a subclass choice at this level)
          const subclassChoice = data.levels[level].subclass;
          if (subclassChoice) {
            const p = document.createElement("p");
            p.innerHTML = `<strong>${subclassChoice.label}</strong>`;
            mount.appendChild(p);

            fetch(`./data/subclasses/${data.id}/index.json`)
              .then(r => r.json())
              .then(subs => {
                const ul = document.createElement("ul");

                subs.forEach(sc => {
                  const li = document.createElement("li");
                  li.textContent = sc.name;
                  li.style.cursor = "pointer";

                  li.onclick = () => {
                    history.pushState(
                      { type: "subclass", id: sc.id, classId: data.id },
                      "",
                      `#/subclass/${data.id}/${sc.id}`
                    );
                    window.dispatchEvent(new Event("navigate-detail"));
                  };

                  ul.appendChild(li);
                });

                mount.appendChild(ul);
              })
              .catch(() => {
                const p2 = document.createElement("p");
                p2.textContent = "Subclass list missing.";
                mount.appendChild(p2);
              });
          }

          // Level features
          (data.levels[level].features || []).forEach(f => {
            mount.appendChild(featureBlock(f.name, f.description));
          });
        });
    }
  }

  /* =========================
     SUBCLASS DETAIL
  ========================= */
  if (data.featuresByLevel) {
    mount.appendChild(section("Subclass Features"));

    Object.keys(data.featuresByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(level => {
        const h3 = document.createElement("h3");
        h3.textContent = `Level ${level}`;
        mount.appendChild(h3);

        (data.featuresByLevel[level] || []).forEach(feature => {
          mount.appendChild(featureBlock(feature.name, feature.description));

          // Subclass always-prepared spell table
          if (feature.type === "spell-table" && feature.spells) {
            mount.appendChild(renderSpellTable(feature.spells));
          }

          // Dice table (Experimental Elixir, etc.)
          if (feature.type === "table" && feature.table) {
            mount.appendChild(renderDiceTable(feature.table));
          }
        });
      });
  }
}
