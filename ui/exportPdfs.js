import { character } from "../data/character.js";
import { buildPdfCharacterData } from "../engine/pdfExport.js";

const { PDFDocument, rgb, StandardFonts } = PDFLib;

export async function exportCharacterPdf() {
  // 1. Load base PDF
  const pdfBytes = await fetch("/pdfs/character-sheet.pdf")
  .then(r => {
    if (!r.ok) throw new Error("Failed to load character sheet PDF");
    return r.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;

  const data = buildPdfCharacterData(character);

  // Helper
  const draw = (text, x, y, size = fontSize) => {
    if (!text) return;
    page.drawText(String(text), {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    });
  };

  /* =========================
     HEADER
  ========================= */
  draw(data.name, 60, 750);
  draw(data.class, 250, 750);
  draw(data.level, 340, 750);
  draw(data.background, 60, 725);
  draw(data.species, 250, 725);

  /* =========================
     ABILITIES
  ========================= */
  const abilityY = {
    str: 660,
    dex: 610,
    con: 560,
    int: 510,
    wis: 460,
    cha: 410
  };

  for (const [key, value] of Object.entries(data.abilities)) {
    draw(value, 70, abilityY[key], 14);
  }

  /* =========================
     COMBAT
  ========================= */
  draw(data.armorClass, 360, 660, 12);
  draw(data.initiative, 360, 610, 12);
  draw(data.speed, 360, 560, 12);
  draw(data.hitPoints.max, 420, 610);
  draw(data.hitPoints.current, 460, 610);

  /* =========================
     FEATURES (ROUGH BLOCK)
  ========================= */
  let featureY = 300;
  for (const feature of data.classFeatures.slice(0, 8)) {
    draw(`• ${feature}`, 50, featureY, 8);
    featureY -= 12;
  }

  // 2. Save & download
  const pdfOut = await pdfDoc.save();
  const blob = new Blob([pdfOut], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "character"}-sheet.pdf`;
  a.click();

  URL.revokeObjectURL(url);
}
