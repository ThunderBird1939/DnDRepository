import { loadDetail } from "./detailLoader.js";

const sheetView = document.getElementById("sheetView");
const detailView = document.getElementById("detailView");

export function openDetail(type, id, parentId = null) {
  if (!type || !id) return;

  sheetView.hidden = true;
  detailView.hidden = false;

  loadDetail(type, id, parentId);
}

export function closeDetail() {
  history.pushState(null, "", "#/");
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
    closeDetail();
    return;
  }

  const [type, a, b] = parts;

  // ✅ subclass route: /subclass/<classId>/<subclassId>
  if (type === "subclass" && a && b) {
    openDetail("subclass", b, a);
    return;
  }

  // ✅ class / race / feat: /class/<id>
  if (a) {
    openDetail(type, a);
  }
}

// Manual navigation trigger
window.addEventListener("navigate-detail", routeFromHash);

// Back / forward buttons
window.addEventListener("popstate", routeFromHash);
