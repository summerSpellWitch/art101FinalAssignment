(() => {
  const listeners = new Map();

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of set) fn(payload);
  }

  function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  }

  function wsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  let ws = null;
  let isOpen = false;
  let reconnectMs = 400;

  function connect() {
    ws = new WebSocket(wsUrl());

    ws.addEventListener("open", () => {
      isOpen = true;
      reconnectMs = 400;
      emit("ws:status", { connected: true });
    });

    ws.addEventListener("close", () => {
      isOpen = false;
      emit("ws:status", { connected: false });
      window.setTimeout(connect, reconnectMs);
      reconnectMs = Math.min(2500, Math.round(reconnectMs * 1.6));
    });

    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!msg?.type) return;
      emit(msg.type, msg);
    });
  }

  function send(type, payload = {}) {
    if (!ws || !isOpen) return false;
    ws.send(JSON.stringify({ type, ...payload }));
    return true;
  }

  connect();

  window.GEHENNA_WS = {
    on,
    send,
  };
})();

