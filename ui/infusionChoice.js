export function openInfusionChoiceModal(character) {
  const pending = character.pendingChoices?.infusions;
  if (!pending) return;

  const modal = document.getElementById("infusionChoiceModal");
  const backdrop = document.getElementById("infusionBackdrop");
  const optionsDiv = document.getElementById("infusionChoiceOptions");
  const confirmBtn = document.getElementById("confirmInfusions");

  if (!modal || !backdrop || !optionsDiv || !confirmBtn) {
    console.warn("Infusion modal elements missing");
    return;
  }

  modal.hidden = false;
  backdrop.hidden = false;
  optionsDiv.innerHTML = "";
  confirmBtn.disabled = true;

  const selected = new Set();

  // load infusions
  fetch("./data/infusions/artificer.json")
    .then(r => r.json())
    .then(infusions => {
      infusions.forEach(infusion => {
        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = infusion.id;

        checkbox.addEventListener("change", () => {
          checkbox.checked
            ? selected.add(infusion.id)
            : selected.delete(infusion.id);

          if (selected.size > pending.choose) {
            checkbox.checked = false;
            selected.delete(infusion.id);
          }

          confirmBtn.disabled = selected.size !== pending.choose;
        });

        label.appendChild(checkbox);
        label.append(` ${infusion.name}`);
        optionsDiv.appendChild(label);
      });
    });

  confirmBtn.onclick = () => {
    selected.forEach(id => character.infusions.known.add(id));

    character.pendingChoices.infusions = null;
    character.resolvedChoices.infusions = true;

    modal.hidden = true;
    backdrop.hidden = true;

    window.dispatchEvent(new Event("infusions-updated"));
  };
}
