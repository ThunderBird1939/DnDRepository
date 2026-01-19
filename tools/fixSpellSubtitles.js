import fs from "fs";

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function fixSubtitle(spell) {
  const i = spell.contents.findIndex(l => l.startsWith("subtitle |"));
  if (i === -1) return;

  let text = spell.contents[i].replace("subtitle |", "").trim();

  if (/cantrip/i.test(text)) {
    const school = text.replace(/cantrip/i, "").trim().toLowerCase();
    spell.contents[i] = `subtitle | ${school} cantrip`;
    return;
  }

  const m = text.match(/Level (\d+) ([A-Za-z]+)/i);
  if (!m) return;

  const level = Number(m[1]);
  const school = m[2].toLowerCase();
  spell.contents[i] = `subtitle | ${ordinal(level)}-level ${school}`;
}

function process(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.forEach(fixSubtitle);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`✔ Fixed ${file}`);
}

process("./data/spells/bard.json");
process("./data/spells/wizard.json");
