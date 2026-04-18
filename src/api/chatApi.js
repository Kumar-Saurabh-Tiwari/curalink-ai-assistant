const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const wrapped = new Error(error.message || 'Request failed');
    wrapped.status = response.status;
    throw wrapped;
  }

  return response.json();
}

export async function sendMessage(payload) {
  return requestJson(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function getConversation(sessionId) {
  return requestJson(`${API_BASE}/api/chat/conversation/${sessionId}`);
}
