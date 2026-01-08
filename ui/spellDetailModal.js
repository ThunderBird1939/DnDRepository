const modal = document.getElementById("spellDetailModal");
const backdrop = document.getElementById("spellDetailBackdrop");
const titleEl = document.getElementById("spellDetailTitle");
const bodyEl = document.getElementById("spellDetailBody");
const closeBtn = document.getElementById("closeSpellDetail");

function renderSpellContents(contents = []) {
  bodyEl.innerHTML = "";

  contents.forEach(line => {
    const [type, ...rest] = line.split(" | ");
    const value = rest.join(" | ");

    if (type === "subtitle") {
      const p = document.createElement("p");
      p.className = "spell-subtitle";
      p.textContent = value;
      bodyEl.appendChild(p);
    } else if (type === "property") {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${rest[0]}:</strong> ${rest[1]}`;
      bodyEl.appendChild(p);
    } else if (type === "section") {
      const h = document.createElement("h4");
      h.textContent = value;
      bodyEl.appendChild(h);
    } else if (type === "text") {
      const p = document.createElement("p");
      p.textContent = value;
      bodyEl.appendChild(p);
    } else if (type === "rule") {
      bodyEl.appendChild(document.createElement("hr"));
    }
  });
}

export function openSpellDetail(spell) {
  titleEl.textContent = spell.title;
  renderSpellContents(spell.contents);

  modal.hidden = false;
  backdrop.hidden = false;
}

closeBtn.onclick = () => {
  modal.hidden = true;
  backdrop.hidden = true;
};
