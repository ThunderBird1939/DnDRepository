export function applyInvocation(character, invocationData) {
  if (!invocationData) return;

  character.invocations ??= new Set();
  character.features ??= [];

  // Prevent duplicates
  if (character.invocations.has(invocationData.id)) return;

  character.invocations.add(invocationData.id);

  // Add as feature (for UI display)
  character.features.push({
    id: invocationData.id,
    name: invocationData.name,
    description: invocationData.description,
    source: "eldritch-invocations",
    type: "invocation"
  });

  // Handle grants
  const grants = invocationData.grants ?? {};

  // At-will spells
  if (Array.isArray(grants.atWillSpells)) {
    character.spellcasting ??= {};
    character.spellcasting.alwaysPrepared ??= new Set();

    grants.atWillSpells.forEach(spellId =>
      character.spellcasting.alwaysPrepared.add(spellId)
    );
  }

  // Mark resolved
  character.resolvedChoices ??= {};
  character.resolvedChoices.invocations = true;

  delete character.pendingChoices.invocations;

  window.dispatchEvent(new Event("features-updated"));
}
