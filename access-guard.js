(() => {
  const pageId = document.documentElement.dataset.pageId;
  if (!pageId) return;

  const STORAGE_KEY = "gehenna.killedPageIds";
  const SNAPSHOT_KEY = `gehenna.terminatedSnapshot:${pageId}`;

  function loadKilledIdsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function isTerminatedView() {
    return document.documentElement.dataset.gehennaTerminated === "1";
  }

  function saveTerminationSnapshot() {
    try {
      sessionStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({ url: String(window.location.href), pageId: String(pageId), v: 1 }),
      );
    } catch {
      // ignore
    }
  }

  function reloadFromSnapshotIfPossible() {
    let snap = null;
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      snap = raw ? JSON.parse(raw) : null;
    } catch {
      snap = null;
    }

    const url = snap && typeof snap.url === "string" ? snap.url : String(window.location.href);
    window.location.replace(url);
  }

  function terminatePage() {
    saveTerminationSnapshot();
    document.documentElement.dataset.gehennaTerminated = "1";

    document.documentElement.lang = "en";
    document.head.innerHTML = "";
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "UTF-8");
    const vp = document.createElement("meta");
    vp.setAttribute("name", "viewport");
    vp.setAttribute("content", "width=device-width, initial-scale=1.0");
    const title = document.createElement("title");
    title.textContent = "Terminated";
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: 100%; margin: 0; }
      body {
        background: #000;
        color: #1a1a1a;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        display: grid;
        place-items: center;
      }
    `;
    document.head.append(meta, vp, title, style);

    document.body.innerHTML = "";
    const msg = document.createElement("div");
    msg.textContent = "CONNECTION TERMINATED";
    document.body.appendChild(msg);
  }

  function applyKilledIds(ids) {
    const set = new Set((ids ?? []).map(String));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set].sort()));
    } catch {
      // ignore
    }
    if (set.has(String(pageId))) terminatePage();
    else if (isTerminatedView()) reloadFromSnapshotIfPossible();
  }

  applyKilledIds(loadKilledIdsFromStorage());

  window.GEHENNA_WS?.on?.("page:killed", ({ ids }) => {
    applyKilledIds(ids);
  });
})();
