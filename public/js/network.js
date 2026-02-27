// ═══ Network — WebSocket client wrapper ═══
const Network = (() => {
  let ws = null;
  let handlers = {};
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 5;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      console.log('Connected to server');
      reconnectAttempts = 0;
      if (handlers.connected) handlers.connected();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (handlers[msg.type]) {
          handlers[msg.type](msg);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected');
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setTimeout(connect, 1000 * reconnectAttempts);
      }
      if (handlers.disconnected) handlers.disconnected();
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  function send(type, data = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  }

  function on(type, handler) {
    handlers[type] = handler;
  }

  function off(type) {
    delete handlers[type];
  }

  return { connect, send, on, off };
})();
