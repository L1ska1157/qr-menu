// In-memory SSE registry: sessionId → Set<res>
const clients = new Map();

export function subscribe(sessionId, res) {
  if (!clients.has(sessionId)) clients.set(sessionId, new Set());
  clients.get(sessionId).add(res);
}

export function unsubscribe(sessionId, res) {
  const set = clients.get(sessionId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(sessionId);
}

export function publish(sessionId, event, data) {
  const set = clients.get(sessionId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}
