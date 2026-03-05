import { loadDetail } from "./detailLoader.js";

const sheetView = document.getElementById("sheetView");
const detailView = document.getElementById("detailView");

export function openDetail(type, id, parentId = null, updateHash = true) {
  if (!type || !id) return;

  if (updateHash) {
    const hash = type === "subclass" && parentId
      ? `#/subclass/${parentId}/${id}`
      : `#/${type}/${id}`;
    history.pushState({ type, id, parentId }, "", hash);
  }

  sheetView.hidden = true;
  detailView.hidden = false;

  loadDetail(type, id, parentId);
}

export function closeDetail(updateHash = true) {
  if (updateHash) history.pushState(null, "", "#/");
  detailView.hidden = true;
  sheetView.hidden = false;
  detailView.innerHTML = "";
}

/* =========================
   HASH ROUTER
========================= */
function routeFromHash() {
  const parts = location.hash.replace("#/", "").split("/");

  if (!parts[0]) {
    closeDetail(false);
    return;
  }

  const [type, a, b] = parts;

  // ✅ subclass route: /subclass/<classId>/<subclassId>
  if (type === "subclass" && a && b) {
    openDetail("subclass", b, a, false);
    return;
  }

  // ✅ class / race / background: /type/<id>
  if (a) {
    openDetail(type, a, null, false);
  }
}

// Manual navigation trigger
window.addEventListener("navigate-detail", routeFromHash);
window.addEventListener("close-detail", () => closeDetail());

// Back / forward buttons
window.addEventListener("popstate", routeFromHash);

// Initial load (supports direct hash navigation)
routeFromHash();
