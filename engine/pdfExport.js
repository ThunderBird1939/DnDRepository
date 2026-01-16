export function buildPdfCharacterData(character) {
  const abilityMod = v => Math.floor((v - 10) / 2);
  const proficiency = lvl => Math.ceil(1 + lvl / 4);

  return {
    name: character.name,
    class: character.class?.name,
    subclass: character.subclass?.name,
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

    // 🔑 THESE ARE NOW RELIABLE
   raceFeatures: {
  properties: character.features.filter(
    f => f.source === "race" && f.category === "property"
  ),
  descriptions: character.features.filter(
    f => f.source === "race" && f.category === "description"
  )
},
    classFeatures: character.features.filter(f => f.source === character.class?.id),
    subclassFeatures: character.features.filter(f => f.source === character.subclass?.id)
  };
}

