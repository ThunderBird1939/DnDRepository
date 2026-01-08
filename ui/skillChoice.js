function formatSkillName(skill) {
  return skill
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase());
}

export function renderSkillChoice(character) {
  const pending = character.pendingChoices?.skills;
  if (!pending) return;

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

  // Show modal
  modal.hidden = false;
  backdrop.hidden = false;

  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;

  title.textContent = `Choose ${pending.choose} Skills`;
  hint.textContent = `Select ${pending.choose} from the list below.`;

  const selected = new Set();

  pending.from.forEach(skill => {
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

confirmBtn.onclick = () => {
  // 🔒 Hard set skills (do NOT just add)
  character.proficiencies.skills = new Set(selected);

  // ✅ mark choice resolved
  character.pendingChoices.skills = null;
  character.resolvedChoices ??= {};
  character.resolvedChoices.skills = true;

  modal.hidden = true;
  backdrop.hidden = true;

  // 🔔 notify rest of app
  window.dispatchEvent(new Event("skills-updated"));
};

}
