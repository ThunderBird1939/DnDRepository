export let monsters = [];

export async function loadMonsters() {
  console.log("Loading monsters…");

  const res = await fetch("./data/creatures.all.json");
  console.log("Monster fetch status:", res.status);

  monsters = await res.json();
  console.log("Monsters loaded:", monsters);
}
