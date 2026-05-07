import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

let scanState = {
  enabled: false,
  x: 0.5,
  y: 0.5,
  wPx: 300,
  hPx: 200,
};

/** @type {Set<string>} */
const killedPageIds = new Set(["3223"]);

let decipherServiceEnabled = false;
let shieldServiceEnabled = false;

function safeSend(ws, obj) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(msg);
  }
}

wss.on("connection", (ws) => {
  safeSend(ws, { type: "scan:state", state: scanState });
  safeSend(ws, { type: "page:killed", ids: [...killedPageIds].sort() });
  safeSend(ws, { type: "decipher:state", enabled: decipherServiceEnabled });
  safeSend(ws, { type: "shield:state", enabled: shieldServiceEnabled });

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }

    if (msg?.type === "scan:set") {
      const next = msg.state ?? {};
      scanState = {
        enabled: Boolean(next.enabled),
        x: Number.isFinite(next.x) ? Math.min(1, Math.max(0, next.x)) : scanState.x,
        y: Number.isFinite(next.y) ? Math.min(1, Math.max(0, next.y)) : scanState.y,
        wPx: Number.isFinite(next.wPx) ? Math.min(2000, Math.max(40, next.wPx)) : scanState.wPx,
        hPx: Number.isFinite(next.hPx) ? Math.min(2000, Math.max(40, next.hPx)) : scanState.hPx,
      };
      broadcast({ type: "scan:state", state: scanState });
    }

    if (msg?.type === "page:kill") {
      const id = String(msg.id ?? "").trim();
      if (!id) return;
      killedPageIds.add(id);
      broadcast({ type: "page:killed", ids: [...killedPageIds].sort() });
    }

    if (msg?.type === "page:revive") {
      const id = String(msg.id ?? "").trim();
      if (!id) return;
      killedPageIds.delete(id);
      broadcast({ type: "page:killed", ids: [...killedPageIds].sort() });
    }

    if (msg?.type === "decipher:set") {
      decipherServiceEnabled = Boolean(msg.enabled);
      broadcast({ type: "decipher:state", enabled: decipherServiceEnabled });
    }

    if (msg?.type === "shield:set") {
      shieldServiceEnabled = Boolean(msg.enabled);
      broadcast({ type: "shield:state", enabled: shieldServiceEnabled });
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GehennaOS listening on http://localhost:${PORT}`);
});

