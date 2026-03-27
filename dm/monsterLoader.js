export let monsters = [];

async function fetchCreatures(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Expected an array from ${url}`);
  }

  return data;
}

export async function loadMonsters() {
  console.log("Loading monsters...");

  const stamp = Date.now();
  const urls = [
    `./data/creatures.all.json?v=${stamp}`,
    `./data/creatures.json?v=${stamp}`,
    "./data/creatures.all.json",
    "./data/creatures.json"
  ];

  let loaded = null;
  for (const url of urls) {
    try {
      loaded = await fetchCreatures(url);
      break;
    } catch (_err) {
      // Try the next known path.
    }
  }

  if (!loaded) {
    throw new Error("Unable to load creature data from known paths.");
  }

  monsters = loaded;
  console.log("Monsters loaded:", monsters.length);
}
