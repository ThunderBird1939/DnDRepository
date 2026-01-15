function formatSkillName(skill) {
  return skill
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export async function renderSkillChoice(character) {
  const pending = character.pendingChoices?.skills;
  if (!pending) return;

  /* =========================
     Resolve options
  ========================= */
  let options;

  if (pending.from === "any") {
    const res = await fetch("./data/skills.json");
    if (!res.ok) {
      console.error("Failed to load skills.json");
      return;
    }
    const skills = await res.json();
    options = skills.map(s => s.id);
  } else {
    options = pending.from;
  }

  if (!Array.isArray(options)) {
    console.error("Invalid skill options:", pending);
    return;
  }

  /* =========================
     Modal Elements
  ========================= */
  const modal = document.getElementById("skillChoiceModal");
  const backdrop = document.getElementById("modalBackdrop");
  const title = document.getElementById("skillChoiceTitle");
  const hint = document.getElementById("skillChoiceHint");
  const optionsDiv = document.getElementById("skillChoiceOptions");
  const confirmBtn = document.getElementById("confirmSkills");

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) {
    console.warn("Skill choice modal elements missing");
    return;
  }

  /* =========================
     Show modal
  ========================= */
  modal.hidden = false;
  backdrop.hidden = false;

  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;

  title.textContent = `Choose ${pending.choose} Skill${pending.choose > 1 ? "s" : ""}`;
  hint.textContent = `Select ${pending.choose} from the list below.`;

  const selected = new Set();

  /* =========================
     Render options
  ========================= */
  options.forEach(skill => {
    // Skip already-known skills
    if (character.proficiencies.skills?.has(skill)) return;

    const label = document.createElement("label");
    label.style.display = "block";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = skill;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selected.add(skill);
      } else {
        selected.delete(skill);
      }

      // Enforce limit
      if (selected.size > pending.choose) {
        checkbox.checked = false;
        selected.delete(skill);
      }

      confirmBtn.disabled = selected.size !== pending.choose;
    });

    label.appendChild(checkbox);
    label.append(` ${formatSkillName(skill)}`);
    optionsDiv.appendChild(label);
  });

  /* =========================
     Confirm
  ========================= */
confirmBtn.onclick = () => {
  character.proficiencies.skills ??= new Set();
  selected.forEach(skill => character.proficiencies.skills.add(skill));

  // ✅ resolve correct choice
  character.resolvedChoices ??= {};

  if (pending.source === "lore") {
    character.resolvedChoices.loreBonusSkills = true;
  } else {
    character.resolvedChoices.skills = true;
  }

  delete character.pendingChoices.skills;

  modal.hidden = true;
  backdrop.hidden = true;

  window.dispatchEvent(new Event("skills-updated"));
  window.dispatchEvent(new Event("features-updated"));
};

}
