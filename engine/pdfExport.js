export function buildPdfCharacterData(character) {
  const abilityMod = v => Math.floor((v - 10) / 2);
  const proficiency = lvl => Math.ceil(1 + lvl / 4);

  return {
    name: character.name,
    class: character.class?.name,
    level: character.level,
    background: character.background?.name,
    species: character.race?.name,

    abilities: character.abilities,

    proficiencyBonus: proficiency(character.level),

    armorClass: character.combat?.armorClass,
    initiative: abilityMod(character.abilities.dex),
    speed: character.combat?.speed,

    hitPoints: {
      max: character.hp.max,
      current: character.hp.current
    },

    classFeatures: character.features.map(f => f.name)
  };
}
