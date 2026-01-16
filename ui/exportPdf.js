import { character } from "../data/character.js";
import { buildPdfCharacterData } from "../engine/pdfExport.js";

const { PDFDocument, rgb, StandardFonts } = PDFLib;
const DEBUG_GRID = false; // ← toggle this on/off

/* =========================
   PDF POSITIONS
========================= */
const POSITIONS = {
  header: {
    name:       { x: 40,  y: 760 },
    class:      { x: 160, y: 740 },
    subclass:   { x: 160, y: 715 },
    level:      { x: 280, y: 742 },
    background: { x: 40,  y: 740 },
    species:    { x: 40,  y: 715 }
  },

  proficiencyBonus: { x: 50, y: 625 },

  abilities: {
    str: { x: 66,  y: 553 },
    dex: { x: 66,  y: 433 },
    con: { x: 66,  y: 283 },
    int: { x: 175, y: 630 },
    wis: { x: 175, y: 453 },
    cha: { x: 175, y: 280 }
  },
  skills: {
    acrobatics:      { x: 20,  y: 380 },
    animalHandling:  { x: 130, y: 400 },
    arcana:          { x: 130, y: 580 },
    athletics:       { x: 20,  y: 500 },
    deception:       { x: 130, y: 225 },
    history:         { x: 130, y: 565 },
    insight:         { x: 130, y: 388 },
    intimidation:    { x: 130, y: 210 },
    investigation:   { x: 130, y: 550 },
    medicine:        { x: 130, y: 375 },
    nature:          { x: 130, y: 535 },
    perception:      { x: 130, y: 360 },
    performance:     { x: 130, y: 195 },
    persuasion:      { x: 130, y: 180 },
    religion:        { x: 130, y: 520 },
    sleightOfHand:   { x: 20,  y: 365 },
    stealth:         { x: 20,  y: 350 },
    survival:        { x: 130, y: 345 }
  },

  abilityMods: {
    str: { x: 42,  y: 560 },
    dex: { x: 42,  y: 440 },
    con: { x: 42,  y: 290 },
    int: { x: 145, y: 635 },
    wis: { x: 145, y: 460 },
    cha: { x: 145, y: 290 }
  },

  attacks: {
    nameX: 230,
    bonusX: 360,
    damageX: 390,
    typeX: 415,
    startY: 575,
    lineHeight: 20,
    minY: 170
  },

  combat: {
    ac:     { x: 335, y: 730 },
    init:   { x: 260, y: 645 },
    speed:  { x: 345, y: 645 },
    hpMax:  { x: 460, y: 718 },
    hitDie: { x: 525, y: 718 }
  },

  spellcastingPage2: {
    ability:  { x: 30, y: 760 }, // INT / WIS / CHA
    modifier: { x: 20, y: 730 }, // +3
    attack:   { x: 20, y: 700 }, // +5
    saveDC:   { x: 20, y: 670 }  // 13
  },
  spellSlotsPage2: {
    startY: 695,
    rowHeight: 15,

    levels: {
      1: { x: 190 },
      2: { x: 190 },
      3: { x: 190 },

      4: { x: 278 },
      5: { x: 278 },
      6: { x: 278 },

      7: { x: 360 },
      8: { x: 360 },
      9: { x: 360 }
    },
  },



  features: {
    class: {
      startX: 240,
      startY: 420,
      lineHeight: 11,
      minY: 335
    },
    subclass: {
      startX: 410,
      startY: 420,
      lineHeight: 11,
      minY: 335
    }
  }
};
function drawDebugGrid(page, font) {
  const PAGE_WIDTH = 600;
  const PAGE_HEIGHT = 780;

  for (let x = 0; x <= PAGE_WIDTH; x += 25) {
    const isMajor = x % 100 === 0;

    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: PAGE_HEIGHT },
      thickness: isMajor ? 1 : 0.25,
      color: isMajor ? rgb(0.8, 0, 0) : rgb(1, 0.8, 0.8)
    });

    if (isMajor) {
      page.drawText(String(x), {
        x: x + 2,
        y: 5,
        size: 7,
        font,
        color: rgb(0.8, 0, 0)
      });
    }
  }

  for (let y = 0; y <= PAGE_HEIGHT; y += 25) {
    const isMajor = y % 100 === 0;

    page.drawLine({
      start: { x: 0, y },
      end: { x: PAGE_WIDTH, y },
      thickness: isMajor ? 1 : 0.25,
      color: isMajor ? rgb(0, 0, 0.8) : rgb(0.8, 0.8, 1)
    });

    if (isMajor) {
      page.drawText(String(y), {
        x: 5,
        y: y + 2,
        size: 7,
        font,
        color: rgb(0, 0, 0.8)
      });
    }
  }
}

/* =========================
   EXPORT FUNCTION
========================= */
export async function exportCharacterPdf() {
  const res = await fetch("./character-sheet.pdf");
  if (!res.ok) throw new Error("Failed to load character sheet PDF");

  const pdfBytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const [page1, page2] = pdfDoc.getPages();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  if (DEBUG_GRID) {
  drawDebugGrid(page1, font);
  if (page2) drawDebugGrid(page2, font);
}
  const baseFontSize = 10;

  const data = await buildPdfCharacterData(character);
  console.log("PDF DATA SNAPSHOT:", data);

  /* =========================
     DRAW HELPER
  ========================= */
  const draw = (text, x, y, size = baseFontSize, page = page1) => {
    if (text === undefined || text === null || text === "") return;
    page.drawText(String(text), { x, y, size, font });
  };

  const abilityMod = v => Math.floor((v - 10) / 2);

  /* =========================
     HEADER
  ========================= */
  draw(data.name, POSITIONS.header.name.x, POSITIONS.header.name.y);
  draw(data.class, POSITIONS.header.class.x, POSITIONS.header.class.y);
  draw(data.subclass, POSITIONS.header.subclass.x, POSITIONS.header.subclass.y, 9);
  draw(data.level, POSITIONS.header.level.x, POSITIONS.header.level.y);
  draw(data.background, POSITIONS.header.background.x, POSITIONS.header.background.y);
  draw(data.species, POSITIONS.header.species.x, POSITIONS.header.species.y);

  /* =========================
     ABILITIES + MODS
  ========================= */
  for (const [key, score] of Object.entries(data.abilities || {})) {
    draw(score, POSITIONS.abilities[key].x, POSITIONS.abilities[key].y, 14);
    const mod = abilityMod(score);
    draw(mod >= 0 ? `+${mod}` : mod, POSITIONS.abilityMods[key].x, POSITIONS.abilityMods[key].y);
  }

  /* =========================
     PROF BONUS
  ========================= */
  draw(
    `+${data.proficiencyBonus}`,
    POSITIONS.proficiencyBonus.x,
    POSITIONS.proficiencyBonus.y,
    12
  );

  /* =========================
     COMBAT
  ========================= */
  draw(data.armorClass, POSITIONS.combat.ac.x, POSITIONS.combat.ac.y, 12);
  draw(data.initiative, POSITIONS.combat.init.x, POSITIONS.combat.init.y, 12);
  draw(data.speed, POSITIONS.combat.speed.x, POSITIONS.combat.speed.y, 12);
  draw(data.hitPoints?.max, POSITIONS.combat.hpMax.x, POSITIONS.combat.hpMax.y);
  if (data.hitDie) draw(`d${data.hitDie}`, POSITIONS.combat.hitDie.x, POSITIONS.combat.hitDie.y);
 
  /* =========================
    SKILL PROFICIENCY DOTS
  ========================= */
  const skillProficiencies = character.proficiencies?.skills ?? new Set();
  const skillExpertise = character.proficiencies?.expertise ?? new Set();

  for (const [skill, pos] of Object.entries(POSITIONS.skills)) {
    const isProficient = skillProficiencies.has(skill);
    const isExpert = skillExpertise.has(skill);

    // ❌ no proficiency → nothing drawn
    if (!isProficient && !isExpert) continue;

    // ● proficiency dot
    page1.drawCircle({
      x: pos.x,
      y: pos.y,
      size: 3,
      color: rgb(0, 0, 0)
    });

    // ◎ expertise ring
    if (isExpert) {
      page1.drawCircle({
        x: pos.x,
        y: pos.y,
        size: 6,
        borderWidth: 1,
        borderColor: rgb(0, 0, 0)
      });
    }
  }

  /* =========================
     ATTACKS & WEAPONS
  ========================= */
  let yAtk = POSITIONS.attacks.startY;

  for (const weapon of data.weapons || []) {
    if (yAtk < POSITIONS.attacks.minY) break;

    const mod = abilityMod(data.abilities?.[weapon.ability] ?? 10);
    const prof = weapon.proficient ? data.proficiencyBonus : 0;
    const bonus = mod + prof;

    draw(weapon.name, POSITIONS.attacks.nameX, yAtk, 9);
    draw(bonus >= 0 ? `+${bonus}` : bonus, POSITIONS.attacks.bonusX, yAtk, 9);
    draw(weapon.damage, POSITIONS.attacks.damageX, yAtk, 9);
    draw(weapon.damageType, POSITIONS.attacks.typeX, yAtk, 9);

    yAtk -= POSITIONS.attacks.lineHeight;
  }

  /* =========================
     SPELLCASTING (PAGE 2)
  ========================= */
  if (character.spellcasting?.enabled) {
    // Ability label
    draw(
      character.spellcasting.ability.toUpperCase(),
      POSITIONS.spellcastingPage2.ability.x,
      POSITIONS.spellcastingPage2.ability.y,
      9,
      page2
    );

    // Modifier
    draw(
      data.spellcastingModifier >= 0
        ? `+${data.spellcastingModifier}`
        : data.spellcastingModifier,
      POSITIONS.spellcastingPage2.modifier.x,
      POSITIONS.spellcastingPage2.modifier.y,
      12,
      page2
    );

    // Spell Attack
    draw(
      `+${data.spellAttackBonus}`,
      POSITIONS.spellcastingPage2.attack.x,
      POSITIONS.spellcastingPage2.attack.y,
      12,
      page2
    );

    // Save DC
    draw(
      data.spellSaveDC,
      POSITIONS.spellcastingPage2.saveDC.x,
      POSITIONS.spellcastingPage2.saveDC.y,
      12,
      page2
    );

    }
 /* =========================
   SPELL SLOTS (TOTAL ONLY)
========================= */
if (character.spellcasting?.enabled && data.spellSlots) {
  const cfg = POSITIONS.spellSlotsPage2;

  for (let level = 1; level <= 9; level++) {
    const total = data.spellSlots[level];
    if (!total) continue;

    const pos = cfg.levels[level];
    if (!pos) continue;

    // 3 rows per column
    const rowIndex = (level - 1) % 3;
    const y = cfg.startY - rowIndex * cfg.rowHeight;

    draw(
      String(total),
      pos.x,
      y,
      11,
      page2
    );
  }
}


  /* =========================
     FEATURES
  ========================= */
  let yClass = POSITIONS.features.class.startY;
  for (const f of data.classFeatures || []) {
    if (yClass < POSITIONS.features.class.minY) break;
    draw(`• ${f.name}`, POSITIONS.features.class.startX, yClass, 8);
    yClass -= POSITIONS.features.class.lineHeight;
  }

  let ySub = POSITIONS.features.subclass.startY;
  for (const f of data.subclassFeatures || []) {
    if (ySub < POSITIONS.features.subclass.minY) break;
    draw(`• ${f.name}`, POSITIONS.features.subclass.startX, ySub, 8);
    ySub -= POSITIONS.features.subclass.lineHeight;
  }

  /* =========================
     SAVE
  ========================= */
  const pdfOut = await pdfDoc.save();
  const blob = new Blob([pdfOut], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "character"}-sheet.pdf`;
  a.click();

  URL.revokeObjectURL(url);
}
