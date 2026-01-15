export const character = {
   /* =========================
   BOUND VANGUARD STATE
========================= */
   disposition: null,          // e.g. "obligated-guardian"
   dispositionLocked: false,   // for Unleashed Will, etc.

  /* =========================
     IDENTITY
  ========================= */
  name: "",

  race: null,
  raceSource: null,

  /* =========================
     CLASS (NO DEFAULTS)
  ========================= */
  class: null,          // { id, name, level }
  subclass: null,

    /* =========================
     BACKGROUND
     (APPLIED ONCE)
  ========================= */
  background: {
    id: null,
    name: null,
    source: null
  },

  /* =========================
     ABILITIES (RAW ONLY)
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
     LEVEL (SINGLE SOURCE OF TRUTH)
  ========================= */
  level: null,          // set only by UI

  /* =========================
     PENDING PLAYER CHOICES
  ========================= */
  pendingChoices: {
    skills: null,
    tools: null,
    infusions: null,
    languages: null
  },
  pendingSubclassChoice: null,

  /* =========================
     RESOLVED PLAYER CHOICES
  ========================= */
  resolvedChoices: {
    skills: false,
    tools: false,
    subclass: false,
    infusions: false,
    background: false
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
   skills: new Set(),
   languages: new Set(),    
   vehicles: new Set(),
   expertise: new Set()

   },


  /* =========================
     HIT POINTS
  ========================= */
  hp: {
    hitDie: null,
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

  /* 🔑 CANTRIPS */
  cantripsKnown: 0,
  cantrips: new Set(),

  /* 🔑 SPELLS */
  available: new Set(),       // known spells (wizard book, sorcerer known, etc.)
  prepared: new Set(),        // prepared spells
  alwaysPrepared: new Set(),  // subclass/domain spells

  /* 🔑 LEARNING CONTROL */
  spellsToLearn: 0,           // wizard: spells to add to book this level

  /* 🔑 SPELL SLOTS */
  slotsPerLevel: [],          // array from spellSlots JSON
  slots: {
    max: {},
    used: {}
  }
},
  /* =========================
     INFUSIONS
  ========================= */
  infusions: {
    known: new Set(),
    active: new Set(),
    targets: {}          // ← REQUIRED
  },

  /* =========================
     EQUIPMENT
  ========================= */
  equipment: {
    armor: null,
    shield: false
  },

  /* =========================
     WEAPONS
  ========================= */
  weapons: [],           // ← DECLARED

  /* =========================
     ARMOR CLASS
  ========================= */
  acModifiers: [],
  acOverride: null,

  /* =========================
     COMBAT
  ========================= */
   combat: {
   baseAc: 10,
   speed: 30,

   /* =========================
      OSTRUMITE GUNNER
   ========================= */
   ostrumiteCharges: {
      current: 0,
      max: 0
   },

   /* =========================
      BOUND VANGUARD
   ========================= */
   manifestEnergy: {
      current: 0,
      max: 0
   }
   }
}
