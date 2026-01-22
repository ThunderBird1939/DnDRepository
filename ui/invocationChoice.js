import { character } from "../data/character.js";
import { applyInvocation } from "../engine/applyInvocation.js";

export async function renderInvocationChoice() {
  const modal = document.getElementById("invocationModal");
  const list = document.getElementById("invocationList");
  const confirm = document.getElementById("confirmInvocation");

  if (!modal || !list || !confirm) return;

  const pending = character.pendingChoices?.invocations;
  if (!pending) {
    modal.hidden = true;
    return;
  }

  modal.hidden = false;
  list.innerHTML = "";
  confirm.disabled = true;

  // Load index
  const idxRes = await fetch("./data/eldritch-invocations/index.json");
  if (!idxRes.ok) return;
  const index = await idxRes.json();

  character.invocations ??= new Set();
  let selected = null;

  for (const entry of index) {
    // Skip already known
    if (character.invocations.has(entry.id)) continue;

    const res = await fetch(`./data/eldritch-invocations/${entry.id}.json`);
    if (!res.ok) continue;

    const invocation = await res.json();
    const prereq = invocation.prerequisites ?? {};

    /* =========================
       PREREQUISITE FILTERING
    ========================= */

    // Level
    if (prereq.level && character.level < prereq.level) continue;

    // Pact boon
    if (prereq.pact && character.pactBoon !== prereq.pact) continue;

    // Subclass / patron
    if (
      prereq.subclass &&
      character.subclass?.id !== prereq.subclass
    ) {
      continue;
    }

    /* =========================
       RENDER OPTION
    ========================= */
    const row = document.createElement("div");
    row.className = "invocation-row";

    const name = document.createElement("strong");
    name.textContent = invocation.name;

    const desc = document.createElement("div");
    desc.className = "muted";
    desc.textContent = invocation.description;

    row.append(name, desc);

    row.onclick = () => {
      selected = invocation;
      confirm.disabled = false;

      [...list.children].forEach(c =>
        c.classList.remove("selected")
      );
      row.classList.add("selected");
    };

    list.appendChild(row);
  }

  confirm.onclick = () => {
    if (!selected) return;
    applyInvocation(character, selected);
    modal.hidden = true;
  };
}
