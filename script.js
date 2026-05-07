const outputEl = document.getElementById("output");
const formEl = document.getElementById("commandForm");
const inputEl = document.getElementById("commandInput");
const scanRectEl = document.getElementById("scanRect");

const PAGE_DIRECTORY = {
  "0000": { title: "GehennaOS Console (Home)", url: "./index.html" },
  "0001": { title: "GehennaOS Node 0001", url: "./node-0001.html", hideFromPing: true },
  "2695": { title: "Shield Service 0", url: "./shield-service-0.html", password: "4189", hideFromPing: true },
  "6793": { title: "Link Maze", url: "./link-maze.html" },
  "3240": { title: "Blackout", url: "./blackout.html" },
  "9194": { title: "Password Vault", url: "./password-vault.html", pingId: "23EA" },
  "3223": { title: "Deciphering Service", url: "./deciphering-service.html" },
  "2542": { title: "FBO Surveillance Hub", url: "./fbo-surveillance-hub.html", password: "3677", hideFromPing: true },
  "7581": { title: "FBO Critical Internal Servers", url: "./fbo-critical-internal-servers.html", password: "3475", hideFromPing: true },
  "8875": { title: "Known FBO Services", url: "./known-fbo-services.html", pingId: "22AB" },
  "4781": {
    title: "Obfuscation Service 0",
    url: "./obfuscation-service-0.html",
    password: "6793",
    hideFromPing: true,
  },
  "5462": { title: "Obfuscation Service 1", url: "./obfuscation-service-1.html" },
};

const KILLED_STORAGE_KEY = "gehenna.killedPageIds";

/** @type {Map<string, string>} */
const DECIPHER_MAP = new Map([
  // Example mapping (you can extend this list later)
  ["a1b2c3", "4321"],
  ["23EA", "9194"],
  ["22AB", "8875"],
  ["09EE", "2542"],
  ["1D9D", "7581"],
  ["12AD", "4781"],
]);

function loadKilledPageIds() {
  try {
    const raw = localStorage.getItem(KILLED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveKilledPageIds(set) {
  try {
    localStorage.setItem(KILLED_STORAGE_KEY, JSON.stringify([...set].sort()));
  } catch {
    // ignore
  }
}

let killedPageIds = loadKilledPageIds();

const FBO_VICTORY_TARGETS = ["2542", "7581", "4781"];
let fboRebelVictoryShown = false;

function isPageKilled(pageId) {
  return killedPageIds.has(String(pageId));
}

function maybePrintFboRebelVictory() {
  const allKilled = FBO_VICTORY_TARGETS.every((id) => killedPageIds.has(id));
  if (!allKilled) {
    fboRebelVictoryShown = false;
    return;
  }
  if (fboRebelVictoryShown) return;
  fboRebelVictoryShown = true;

  const line = document.createElement("div");
  line.className = "line yellow";
  line.textContent =
    "INCOMING MESSAGE: Just got a notification on my end that the higher ups in the FBO are in a panic. Looks like you did it! Now clear that console and get out of there before they find you, rebel";
  outputEl.appendChild(line);
}

function applyKilledPageIdsFromServer(ids) {
  const prevHadOb1Killed = killedPageIds.has("5462");
  killedPageIds = new Set((ids ?? []).map(String));
  saveKilledPageIds(killedPageIds);
  const nowHasOb1Killed = killedPageIds.has("5462");
  if (!prevHadOb1Killed && nowHasOb1Killed) {
    addError("NOTICE: Obfuscation Service 1 has gone offline. Switching to backup Obfuscation Service 0");
  }
  maybePrintFboRebelVictory();
  syncAllScramblers();
}

function markPageKilled(pageId) {
  killedPageIds.add(String(pageId));
  saveKilledPageIds(killedPageIds);
  maybePrintFboRebelVictory();
}

function markPageRevived(pageId) {
  killedPageIds.delete(String(pageId));
  saveKilledPageIds(killedPageIds);
  maybePrintFboRebelVictory();
}

function addLine(text, { dim = false } = {}) {
  const line = document.createElement("div");
  line.className = dim ? "line dim" : "line";
  line.textContent = text;
  outputEl.appendChild(line);
}

function addError(text) {
  const line = document.createElement("div");
  line.className = "line red";
  line.textContent = text;
  outputEl.appendChild(line);
}

function addCommandEcho(command) {
  addLine(`C:\\> ${command}`, { dim: true });
}

const DEFAULT_SCAN = { enabled: false, x: 0.5, y: 0.5, wPx: 300, hPx: 200 };
let scan = { ...DEFAULT_SCAN };
let lastSentAt = 0;

let decipherServiceEnabled = false;
let shieldServiceEnabled = false;

const SCRAMBLE_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function randomScramble(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += SCRAMBLE_CHARSET[Math.floor(Math.random() * SCRAMBLE_CHARSET.length)];
  return s;
}

function addRichLine(parts, { dim = false, className = "" } = {}) {
  const line = document.createElement("div");
  const base = dim ? "line dim" : "line";
  line.className = className ? `${base} ${className}` : base;
  for (const p of parts) line.append(p);
  outputEl.appendChild(line);
  return line;
}

/** @type {{ span: HTMLSpanElement, finalStr: string, shouldScramble: () => boolean, intervalMs: number, tick: number | null }[]} */
const ACTIVE_SCRAMBLERS = [];

function syncScrambler(s) {
  const scramble = Boolean(s.shouldScramble());
  if (!scramble) {
    if (s.tick != null) {
      clearInterval(s.tick);
      s.tick = null;
    }
    s.span.textContent = s.finalStr;
    return;
  }

  if (s.tick != null) return;
  s.span.textContent = randomScramble(s.finalStr.length);
  s.tick = window.setInterval(() => {
    // Re-check inside tick so it can stop immediately after state flips.
    if (!s.shouldScramble()) {
      syncScrambler(s);
      return;
    }
    s.span.textContent = randomScramble(s.finalStr.length);
  }, s.intervalMs);
}

function makeScrambleSpan(finalText, { shouldScramble, intervalMs = 45 } = {}) {
  const span = document.createElement("span");
  const finalStr = String(finalText);

  const s = {
    span,
    finalStr,
    shouldScramble: typeof shouldScramble === "function" ? shouldScramble : () => false,
    intervalMs,
    tick: null,
  };

  ACTIVE_SCRAMBLERS.push(s);
  syncScrambler(s);
  return span;
}

function syncAllScramblers() {
  for (const s of ACTIVE_SCRAMBLERS) syncScrambler(s);
}

function shouldScramblePingId(pageId) {
  const id = String(pageId);
  if (id === "5462") return !shieldServiceEnabled;
  if (id === "8875" || id === "9194" || id === "3223") return !isPageKilled("5462");
  return false;
}

function publishScan(next) {
  scan = { ...scan, ...next };
  const ok = window.GEHENNA_WS?.send?.("scan:set", { state: scan });
  if (!ok) {
    // Still update local UI even if disconnected
  }
}

function placeConsoleRect() {
  if (!scanRectEl) return;
  scanRectEl.classList.toggle("on", Boolean(scan.enabled));
  if (!scan.enabled) return;

  const screenEl = scanRectEl.closest(".screen");
  if (!screenEl) return;

  const r = screenEl.getBoundingClientRect();
  const w = Math.round(scan.wPx ?? 300);
  const h = Math.round(scan.hPx ?? 200);
  const left = Math.round(scan.x * r.width - w / 2);
  const top = Math.round(scan.y * r.height - h / 2);

  scanRectEl.style.width = `${w}px`;
  scanRectEl.style.height = `${h}px`;
  scanRectEl.style.left = `${left}px`;
  scanRectEl.style.top = `${top}px`;
  scanRectEl.style.transform = `translate(0, 0)`;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function clampPx(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

let drag = null;

function setScanFromTopLeft(leftPx, topPx) {
  const screenEl = scanRectEl?.closest?.(".screen");
  if (!screenEl) return;
  const r = screenEl.getBoundingClientRect();
  const w = Math.round(scan.wPx ?? 300);
  const h = Math.round(scan.hPx ?? 200);

  const minLeft = 0;
  const minTop = 0;
  const maxLeft = Math.max(0, Math.round(r.width - w));
  const maxTop = Math.max(0, Math.round(r.height - h));

  const clampedLeft = clampPx(Math.round(leftPx), minLeft, maxLeft);
  const clampedTop = clampPx(Math.round(topPx), minTop, maxTop);

  const x = clamp01((clampedLeft + w / 2) / r.width);
  const y = clamp01((clampedTop + h / 2) / r.height);

  scan = { ...scan, x, y };
  placeConsoleRect();

  const now = performance.now();
  if (now - lastSentAt > 33) {
    lastSentAt = now;
    publishScan({ x, y, wPx: w, hPx: h });
  }
}

function runCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;

  addCommandEcho(cmd);

  const parts = cmd.split(/\s+/);
  const command = (parts[0] ?? "").toLowerCase();
  const args = parts.slice(1);

  if (command === "help") {
    addRichLine([
      document.createTextNode("Commands: help, clear, echo <text>, about, ping, open <Page ID> [Password], "),
      makeScrambleSpan("kill <Page ID> [Password]", { shouldScramble: () => !shieldServiceEnabled }),
      document.createTextNode(", "),
      makeScrambleSpan("revive <Page ID>", { shouldScramble: () => !shieldServiceEnabled }),
      document.createTextNode(", decipher <String>, scan"),
    ]);
    return;
  }

  if (command === "about") {
    addLine("GehennaOS build 0.1 (CRT edition)");
    return;
  }

  if (command === "clear") {
    outputEl.innerHTML = "";
    return;
  }

  if (command === "echo") {
    addLine(args.join(" "));
    return;
  }

  if (command === "ping") {
    addLine("Pinging GEHENNA-NET...");
    const ids = Object.keys(PAGE_DIRECTORY)
      .filter((id) => !PAGE_DIRECTORY[id]?.hideFromPing)
      .sort();
    if (ids.length === 0) {
      addLine("No nodes discovered.");
      return;
    }
    for (const id of ids) {
      const entry = PAGE_DIRECTORY[id];
      const displayId = entry?.pingId ?? id;
      addRichLine(
        [
          document.createTextNode("["),
          makeScrambleSpan(displayId, { shouldScramble: () => shouldScramblePingId(id) }),
          document.createTextNode(`] ${entry.title}`),
        ],
        { dim: true },
      );
    }
    addLine(`Discovered ${ids.length} node(s).`, { dim: true });
    return;
  }

  if (command === "open") {
    const pageId = (args[0] ?? "").trim();
    if (!pageId) {
      addError("Usage: open <Page ID> [Password]");
      return;
    }

    if (args.length > 2) {
      addError("Usage: open <Page ID> [Password]");
      return;
    }

    const entry = PAGE_DIRECTORY[pageId];
    if (!entry) {
      addLine(`Page ID '${pageId}' not found. Try: ping`);
      return;
    }

    if (isPageKilled(pageId)) {
      addError(`Access denied: [${pageId}] ${entry.title} is offline.`);
      return;
    }

    const requiredPassword = entry.password;
    const providedPassword = (args[1] ?? "").trim();

    if (requiredPassword) {
      if (!providedPassword) {
        addError(`Access denied: password required for [${pageId}] ${entry.title}.`);
        return;
      }
      if (providedPassword !== requiredPassword) {
        addError(`Access denied: invalid password for [${pageId}] ${entry.title}.`);
        return;
      }
    } else if (providedPassword) {
      addError(`Access denied: this node does not accept a password argument.`);
      return;
    }

    addLine(`Opening [${pageId}] ${entry.title}...`, { dim: true });
    window.open(entry.url, "_blank", "noopener,noreferrer");
    return;
  }

  if (command === "kill") {
    const pageId = (args[0] ?? "").trim();
    const providedPassword = (args[1] ?? "").trim();

    if (!pageId) {
      addError("Usage: kill <Page ID> [Password]");
      return;
    }

    if (args.length > 2) {
      addError("Usage: kill <Page ID> [Password]");
      return;
    }

    if (pageId === "0000") {
      addError("Access denied: cannot terminate the local console node.");
      return;
    }

    const entry = PAGE_DIRECTORY[pageId];
    if (!entry) {
      addLine(`Page ID '${pageId}' not found. Try: ping`);
      return;
    }

    if (isPageKilled(pageId)) {
      addLine(`[${pageId}] ${entry.title} is already offline.`, { dim: true });
      return;
    }

    const requiredPassword = entry.password;
    if (requiredPassword) {
      if (!providedPassword) {
        addError(`Access denied: password required to kill [${pageId}] ${entry.title}.`);
        return;
      }
      if (providedPassword !== requiredPassword) {
        addError(`Access denied: invalid password for [${pageId}] ${entry.title}.`);
        return;
      }
    } else if (providedPassword) {
      addError(`Access denied: this node does not accept a password argument.`);
      return;
    }

    markPageKilled(pageId);
    window.GEHENNA_WS?.send?.("page:kill", { id: pageId });

    addLine(`KILL signal acknowledged: [${pageId}] ${entry.title}`, { dim: true });

    if (pageId === "5462") {
      addError("NOTICE: Obfuscation Service 1 has gone offline. Switching to backup Obfuscation Service 0");
    }
    return;
  }

  if (command === "revive") {
    const pageId = (args[0] ?? "").trim();

    if (!pageId) {
      addError("Usage: revive <Page ID>");
      return;
    }

    if (args.length !== 1) {
      addError("Usage: revive <Page ID>");
      return;
    }

    if (pageId === "0000") {
      addError("Access denied: cannot revive the local console node.");
      return;
    }

    const entry = PAGE_DIRECTORY[pageId];
    if (!entry) {
      addLine(`Page ID '${pageId}' not found. Try: ping`);
      return;
    }

    if (!isPageKilled(pageId)) {
      addLine(`[${pageId}] ${entry.title} is already online.`, { dim: true });
      return;
    }

    markPageRevived(pageId);
    window.GEHENNA_WS?.send?.("page:revive", { id: pageId });

    addLine(`REVIVE signal acknowledged: [${pageId}] ${entry.title}`, { dim: true });
    return;
  }

  if (command === "decipher") {
    const cipher = args.join(" ").trim();
    if (!cipher) {
      addError("Usage: decipher <String>");
      return;
    }

    if (!decipherServiceEnabled) {
      addError(
        "Deciphering Service is offline. Open the Deciphering Service node and enable the service, or use the revive command if the node was killed.",
      );
      return;
    }

    const plain = DECIPHER_MAP.get(cipher);
    if (!plain) {
      addError("Decipher failed: unknown ciphertext.");
      return;
    }

    addLine(plain);
    return;
  }

  if (command === "scan") {
    const nextEnabled = !scan.enabled;
    publishScan({ enabled: nextEnabled, wPx: scan.wPx ?? 300, hPx: scan.hPx ?? 200 });
    placeConsoleRect();
    addLine(nextEnabled ? "SCAN overlay: ON (drag to reposition)" : "SCAN overlay: OFF", { dim: true });
    return;
  }

  addLine(`'${cmd}' is not recognized as an internal or external command.`);
}

// Keep focus on the input like a real console
document.addEventListener("click", () => inputEl.focus());
window.addEventListener("focus", () => inputEl.focus());

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = inputEl.value;
  inputEl.value = "";
  runCommand(value);
});

scanRectEl?.addEventListener?.("pointerdown", (e) => {
  if (!scan.enabled) return;
  const screenEl = scanRectEl.closest(".screen");
  if (!screenEl) return;

  const r = screenEl.getBoundingClientRect();
  const w = Math.round(scan.wPx ?? 300);
  const h = Math.round(scan.hPx ?? 200);
  const left = scan.x * r.width - w / 2;
  const top = scan.y * r.height - h / 2;

  drag = {
    pointerId: e.pointerId,
    offsetX: e.clientX - (r.left + left),
    offsetY: e.clientY - (r.top + top),
  };

  scanRectEl.setPointerCapture(e.pointerId);
  e.preventDefault();
});

scanRectEl?.addEventListener?.("pointermove", (e) => {
  if (!drag || drag.pointerId !== e.pointerId) return;
  const screenEl = scanRectEl.closest(".screen");
  if (!screenEl) return;
  const r = screenEl.getBoundingClientRect();

  const nextLeft = e.clientX - r.left - drag.offsetX;
  const nextTop = e.clientY - r.top - drag.offsetY;
  setScanFromTopLeft(nextLeft, nextTop);
});

function endDrag(e) {
  if (!drag || drag.pointerId !== e.pointerId) return;
  drag = null;
}

scanRectEl?.addEventListener?.("pointerup", endDrag);
scanRectEl?.addEventListener?.("pointercancel", endDrag);

window.addEventListener("resize", () => {
  placeConsoleRect();
});

window.GEHENNA_WS?.on?.("scan:state", ({ state }) => {
  scan = { ...DEFAULT_SCAN, ...(state ?? {}) };
  placeConsoleRect();
});

window.GEHENNA_WS?.on?.("page:killed", ({ ids }) => {
  applyKilledPageIdsFromServer(ids);
});

window.GEHENNA_WS?.on?.("decipher:state", ({ enabled }) => {
  decipherServiceEnabled = Boolean(enabled);
});

window.GEHENNA_WS?.on?.("shield:state", ({ enabled }) => {
  shieldServiceEnabled = Boolean(enabled);
  syncAllScramblers();
});

// Initial boot output
addLine("Welcome to GehennaOS");
(() => {
  const line = document.createElement("div");
  line.className = "line yellow";
  line.textContent =
    "INCOMING MESSAGE: Good job finding a working Gehenna console. Remember, your mission is to search the network and shut down critical FBO services. Maybe these idiots left a list of their servers somewhere?";
  outputEl.appendChild(line);
})();
addLine("Type 'help' for a list of commands.", { dim: true });
