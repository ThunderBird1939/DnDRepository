export function applyPactBoon(character, boon) {
  character.pactBoon = boon.id;

  character.features ??= [];
  if (!character.features.some(f => f.id === boon.id)) {
    character.features.push({
      ...boon,
      source: "pact-boon"
    });
  }

  /* =========================
     PACT OF THE TOME: BONUS CANTRIPS
  ========================= */
  if (boon.id === "tome") {
    character.spellcasting ??= {};
    character.spellcasting.bonusCantrips ??= new Set();

    if (!character.resolvedChoices?.pactTomeCantrips) {
      character.pendingChoices.bonusCantrips = {
        choose: 3,
        from: "any",
        cantripsOnly: true,
        source: "pact-tome"
      };
    }
  }

  delete character.pendingChoices.pactBoon;
}
