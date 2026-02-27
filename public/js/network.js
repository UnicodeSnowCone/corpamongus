// ═══ Network — WebSocket client wrapper ═══
const Network = (() => {
  let ws = null;
  let handlers = {};
  let reconnectAttempts = 0;
  let pendingMessages = []; // Queue messages if socket isn't open yet
  const MAX_RECONNECT = 10;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      console.log('Connected to server');
      reconnectAttempts = 0;
      if (handlers.connected) handlers.connected();
      // Flush any queued messages
      while (pendingMessages.length > 0) {
        const msg = pendingMessages.shift();
        ws.send(msg);
      }
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
        const delay = Math.min(1000 * reconnectAttempts, 5000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
        setTimeout(connect, delay);
      }
      if (handlers.disconnected) handlers.disconnected();
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  function send(type, data = {}) {
    const msg = JSON.stringify({ type, ...data });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      // Socket is still connecting — queue it
      pendingMessages.push(msg);
    } else {
      // Socket is closed/closing — reconnect and queue
      console.warn('WebSocket not open, queuing message and reconnecting...');
      pendingMessages.push(msg);
      reconnectAttempts = 0;
      connect();
    }
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function on(type, handler) {
    handlers[type] = handler;
  }

  function off(type) {
    delete handlers[type];
  }

  return { connect, send, on, off, isConnected };
})();
