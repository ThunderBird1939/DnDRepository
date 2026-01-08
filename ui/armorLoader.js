let ARMOR_CACHE = null;

export async function loadArmor() {
  if (ARMOR_CACHE) return ARMOR_CACHE;

  const res = await fetch("./data/armor.json");
  if (!res.ok) throw new Error("Failed to load armor.json");

  ARMOR_CACHE = await res.json();
  return ARMOR_CACHE;
}
