import { character } from "../data/character.js";
import { applyPactBoon } from "../engine/applyPactBoon.js";

export async function renderPactBoonChoice() {
  const modal = document.getElementById("pactBoonModal");
  const list = document.getElementById("pactBoonList");
  const confirm = document.getElementById("confirmPactBoon");

  if (!modal || !list || !confirm) return;

  const pending = character.pendingChoices?.pactBoon;
  if (!pending) {
    modal.hidden = true;
    return;
  }

  modal.hidden = false;
  list.innerHTML = "";
  confirm.disabled = true;

  const res = await fetch("./data/pact-boons/index.json");
  const index = await res.json();

  let selected = null;

  for (const entry of index) {
    const r = await fetch(`./data/pact-boons/${entry.id}.json`);
    if (!r.ok) continue;
    const boon = await r.json();

    const row = document.createElement("div");
    row.className = "pact-row";
    row.innerHTML = `<strong>${boon.name}</strong><div class="muted">${boon.description}</div>`;

    row.onclick = () => {
      selected = boon;
      confirm.disabled = false;
      [...list.children].forEach(c => c.classList.remove("selected"));
      row.classList.add("selected");
    };

    list.appendChild(row);
  }

  confirm.onclick = () => {
    if (!selected) return;
    applyPactBoon(character, selected);
    modal.hidden = true;
  };
}
