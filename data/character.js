export const character = {
  /* =========================
     IDENTITY
  ========================= */
  name: "",

  race: null,
  raceSource: null,

  /* =========================
     CLASS
  ========================= */
  class: {
    id: null,
    level: 1
  },


  subclass: null,

  /* =========================
     ABILITIES (RAW ONLY)
     Final = raw + race + class
  ========================= */
  abilities: {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10
  },

  /* =========================
     PENDING PLAYER CHOICES
     (engine-pausing state)
  ========================= */
  pendingChoices: {
    skills: null,
    tools: null,
    infusions: null
  },
  pendingSubclassChoice: null,


  /* =========================
     RESOLVED PLAYER CHOICES
     (one-time permanent flags)
  ========================= */
  resolvedChoices: {
    skills: false,
    tools: false,
    subclass: false,
    infusions: false
  },

  /* =========================
     SAVING THROWS
  ========================= */
  savingThrows: {
    str: false,
    dex: false,
    con: false,
    int: false,
    wis: false,
    cha: false
  },

  /* =========================
     PROFICIENCIES
  ========================= */
  proficiencies: {
    armor: new Set(),
    weapons: new Set(),
    tools: new Set(),
    skills: new Set()
  },

  /* =========================
     HIT POINTS
  ========================= */
  hp: {
    hitDie: null,        // set by class
    max: 0,
    current: 0,
    temp: 0,
    hitDiceSpent: 0
  },

  /* =========================
     FEATURES
  ========================= */
  features: [],

  /* =========================
     SPELLCASTING
  ========================= */
  spellcasting: {
    enabled: false,
    ability: null,
    type: null,
    focus: [],
    ritual: false,

    prepared: new Set(),        // player-chosen
    alwaysPrepared: new Set(),  // class + subclass
    available: new Set()        // class list (optional future)
  },

/* =========================
   INFUSIONS
========================= */
infusions: {
  known: new Set(),
  active: new Set()
},
  /* =========================
     EQUIPMENT
  ========================= */
  equipment: {
    armor: null,   // armor id from armor.json (e.g. "chain-mail")
    shield: false  // boolean for now (magic shields later)
  },

  /* =========================
     ARMOR CLASS MODIFIERS
     (Defense style, magic, etc.)
  ========================= */
  acModifiers: [],
  
  /* =========================
     ARMOR CLASS OVERRIDE
     (Mage Armor, Unarmored Defense)
  ========================= */
  acOverride: null,

  /* =========================
     COMBAT
  ========================= */
  combat: {
    baseAc: 10,
    speed: 30
  }
};
