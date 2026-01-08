import { renderDetail } from "./detailRenderer.js";

export async function loadDetail(type, id, parentId) {
  const mount = document.getElementById("detailView");
  mount.innerHTML = "<p>Loading...</p>";

  try {
    let url;

    if (type === "class") {
      url = `./data/classes/${id}.json`;
    } 
    else if (type === "subclass") {
      if (!parentId) throw new Error("Missing parent class");
      url = `./data/subclasses/${parentId}/${id}.json`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Missing data");

    const data = await res.json();
    renderDetail(type, data, mount);
  } catch (err) {
    mount.innerHTML = `<p>Failed to load ${type}.</p>`;
  }
}

