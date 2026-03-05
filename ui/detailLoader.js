import { renderDetail } from "./detailRenderer.js";

export async function loadDetail(type, id, parentId) {
  const mount = document.getElementById("detailView");
  mount.innerHTML = "<p>Loading...</p>";

  try {
    let data = null;

    if (type === "class") {
      const res = await fetch(`./data/classes/${id}.json`);
      if (!res.ok) throw new Error("Missing class data");
      data = await res.json();
    } else if (type === "subclass") {
      if (!parentId) throw new Error("Missing parent class");
      const res = await fetch(`./data/subclasses/${parentId}/${id}.json`);
      if (!res.ok) throw new Error("Missing subclass data");
      data = await res.json();
      data.classId ??= parentId;
    } else if (type === "background") {
      const res = await fetch("./data/backgrounds.json");
      if (!res.ok) throw new Error("Missing backgrounds data");
      const all = await res.json();
      data = (all || []).find(bg => String(bg.id) === String(id));
      if (!data) throw new Error("Background not found");
    } else if (type === "race") {
      const res = await fetch("./data/races.all.json");
      if (!res.ok) throw new Error("Missing races data");
      const all = await res.json();
      data = (all || []).find((r, idx) => String(idx) === String(id));
      if (!data) throw new Error("Race not found");
      data = {
        ...data,
        id,
        name: data.title || "Race",
        source: Array.isArray(data.tags) ? data.tags.find(t => t !== "race") : null
      };
    } else {
      throw new Error(`Unsupported detail type: ${type}`);
    }

    renderDetail(type, data, mount);
  } catch (err) {
    mount.innerHTML = `<p>Failed to load ${type}.</p>`;
  }
}

