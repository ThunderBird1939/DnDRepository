import { character } from "../data/character.js";
import { buildPdfCharacterData } from "../engine/pdfExport.js";

const { PDFDocument, rgb, StandardFonts } = PDFLib;

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

  abilities: {
    str: { x: 66,  y: 553 },
    dex: { x: 66,  y: 433 },
    con: { x: 66,  y: 283 },
    int: { x: 175, y: 630 },
    wis: { x: 175, y: 453 },
    cha: { x: 175, y: 280 }
  },
  abilityMods: {
    str: { x: 42,  y: 560 },
    dex: { x: 42,  y: 440 },
    con: { x: 42,  y: 290 },
    int: { x: 145, y: 635 },
    wis: { x: 145, y: 460 },
    cha: { x: 145, y: 290 }
  },
  skills: {
    acrobatics: { x: 260, y: 555 },
    animalHandling: { x: 260, y: 540 },
    arcana: { x: 260, y: 525 },
    athletics: { x: 260, y: 510 },
    deception: { x: 260, y: 495 },
    history: { x: 260, y: 480 },
    insight: { x: 260, y: 465 },
    intimidation: { x: 260, y: 450 },
    investigation: { x: 260, y: 435 },
    medicine: { x: 260, y: 420 },
    nature: { x: 260, y: 405 },
    perception: { x: 260, y: 390 },
    performance: { x: 260, y: 375 },
    persuasion: { x: 260, y: 360 },
    religion: { x: 260, y: 345 },
    sleightOfHand: { x: 260, y: 330 },
    stealth: { x: 260, y: 315 },
    survival: { x: 260, y: 300 }
  },
  combat: {
    ac:         { x: 335, y: 730 },
    initiative: { x: 260, y: 645 },
    speed:      { x: 345, y: 645 },
    hpCurrent:  { x: 405, y: 725 },
    hpMax:      { x: 460, y: 718 }
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
    },
    speciesTraits: {
      startX: 240,
      startY: 160,
      lineHeight: 11,
      minY: 285
    }
  }
};

/* =========================
   EXPORT FUNCTION
========================= */
export async function exportCharacterPdf() {
  /* =========================
     LOAD BASE PDF
  ========================= */
  const res = await fetch("./character-sheet.pdf");
  if (!res.ok) throw new Error("Failed to load character sheet PDF");

  const pdfBytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const baseFontSize = 10;

  const data = buildPdfCharacterData(character);

  /* =========================
     DEBUG GRID (REMOVE LATER)
  ========================= */
  const PAGE_WIDTH = 600;
  const PAGE_HEIGHT = 780;

  for (let x = 0; x <= PAGE_WIDTH; x += 25) {
    const isMajor = x % 100 === 0;
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: PAGE_HEIGHT },
      thickness: isMajor ? 1 : 0.25,
      color: isMajor ? rgb(0.6, 0, 0) : rgb(0.9, 0.7, 0.7)
    });
  }

  for (let y = 0; y <= PAGE_HEIGHT; y += 25) {
    const isMajor = y % 100 === 0;
    page.drawLine({
      start: { x: 0, y },
      end: { x: PAGE_WIDTH, y },
      thickness: isMajor ? 1 : 0.25,
      color: isMajor ? rgb(0, 0, 0.6) : rgb(0.7, 0.7, 0.9)
    });
  }

  /* =========================
     DRAW HELPER
  ========================= */
  const draw = (text, x, y, size = baseFontSize) => {
    if (text === undefined || text === null || text === "") return;
    page.drawText(String(text), { x, y, size, font });
  };

  /* =========================
     HEADER
  ========================= */
  draw(data.name,       POSITIONS.header.name.x,       POSITIONS.header.name.y);
  draw(data.class,      POSITIONS.header.class.x,      POSITIONS.header.class.y);
  draw(data.subclass,   POSITIONS.header.subclass.x,   POSITIONS.header.subclass.y, 9);
  draw(data.level,      POSITIONS.header.level.x,      POSITIONS.header.level.y);
  draw(data.background, POSITIONS.header.background.x, POSITIONS.header.background.y);
  draw(data.species,    POSITIONS.header.species.x,    POSITIONS.header.species.y);

  /* =========================
     ABILITIES
  ========================= */
  for (const [key, value] of Object.entries(data.abilities || {})) {
    const pos = POSITIONS.abilities[key];
    if (pos) draw(value, pos.x, pos.y, 14);
  }
  /* =========================
    ABILITY MODIFIERS
  ========================= */
  const abilityMod = v => Math.floor((v - 10) / 2);

  for (const [key, score] of Object.entries(data.abilities || {})) {
    const pos = POSITIONS.abilityMods[key];
    if (!pos) continue;

    const mod = abilityMod(score);
    const text = mod >= 0 ? `+${mod}` : String(mod);

    draw(text, pos.x, pos.y, 10);
  }

  /* =========================
     COMBAT
  ========================= */
  draw(data.armorClass, POSITIONS.combat.ac.x, POSITIONS.combat.ac.y, 12);
  draw(data.initiative, POSITIONS.combat.initiative.x, POSITIONS.combat.initiative.y, 12);
  draw(data.speed,      POSITIONS.combat.speed.x, POSITIONS.combat.speed.y, 12);
  draw(data.hitPoints?.current, POSITIONS.combat.hpCurrent.x, POSITIONS.combat.hpCurrent.y);
  draw(data.hitPoints?.max,     POSITIONS.combat.hpMax.x,     POSITIONS.combat.hpMax.y);
  /* =========================
    SKILL PROFICIENCY DOTS
  ========================= */
  const skills = character.skills || {};

  for (const [skill, pos] of Object.entries(POSITIONS.skills)) {
    const isProficient = skills[skill]?.proficient;

    page.drawCircle({
      x: pos.x,
      y: pos.y,
      size: 4,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
      color: isProficient ? rgb(0, 0, 0) : undefined
    });
  }

/* =========================
   CLASS FEATURES
========================= */
let yClass = POSITIONS.features.class.startY;
for (const f of data.classFeatures || []) {
  if (yClass < POSITIONS.features.class.minY) break;
  draw(`• ${f.name}`, POSITIONS.features.class.startX, yClass, 8);
  yClass -= POSITIONS.features.class.lineHeight;
}

/* =========================
   SUBCLASS FEATURES
========================= */
let ySub = POSITIONS.features.subclass.startY;
for (const f of data.subclassFeatures || []) {
  if (ySub < POSITIONS.features.subclass.minY) break;
  draw(`• ${f.name}`, POSITIONS.features.subclass.startX, ySub, 8);
  ySub -= POSITIONS.features.subclass.lineHeight;
}


  /* =========================
     SAVE & DOWNLOAD
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
