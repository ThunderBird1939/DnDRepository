import { loadDetail } from "./detailLoader.js";

const sheetView = document.getElementById("sheetView");
const detailView = document.getElementById("detailView");
const dmView = document.getElementById("dmView");
const homeView = document.getElementById("homeView");
const libraryView = document.getElementById("libraryView");
let detailReturnViewId = "sheetView";

function showOnly(viewId) {
  [sheetView, detailView, dmView, homeView, libraryView]
    .filter(Boolean)
    .forEach(el => {
      el.hidden = el.id !== viewId;
    });
}

export function setDetailReturnView(viewId = "sheetView") {
  detailReturnViewId = viewId;
}

export function openDetail(type, id, parentId = null, updateHash = true, returnViewId = null) {
  if (!type || !id) return;
  if (returnViewId) detailReturnViewId = returnViewId;

  if (updateHash) {
    const hash = parentId
      ? `#/${type}/${parentId}/${id}`
      : `#/${type}/${id}`;
    history.pushState({ type, id, parentId }, "", hash);
  }

  showOnly("detailView");
  loadDetail(type, id, parentId);
}

export function closeDetail(updateHash = true) {
  if (updateHash) history.pushState(null, "", "#/");
  showOnly(detailReturnViewId || "sheetView");
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

  // /<type>/<parentId>/<id>
  if (a && b) {
    openDetail(type, b, a, false);
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
