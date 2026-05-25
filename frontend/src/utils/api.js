// In production, VITE_API_URL points to the Railway backend (set in Vercel env).
// In local dev, it falls back to the Vite proxy at /api.
const API_ROOT = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : ''
const BASE = `${API_ROOT}/api`

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { detail = (await res.json()).detail || detail } catch (_) {}
    throw new Error(detail)
  }
  return res
}

export const api = {
  async uploadFile(file, age, goals) {
    const form = new FormData()
    form.append('file', file)
    if (age) form.append('age', age)
    if (goals) form.append('goals', goals)
    const res = await request('/upload', { method: 'POST', body: form })
    return res.json()
  },

  async pasteText(text, age, goals) {
    const res = await request('/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, age, goals }),
    })
    return res.json()
  },

  async manualEntry(holdings, age, goals) {
    const res = await request('/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings, age, goals }),
    })
    return res.json()
  },

  async getPortfolio(sessionId) {
    const res = await request(`/portfolio/${sessionId}`)
    return res.json()
  },

  snapshotUrl(sessionId) {
    return `${BASE}/snapshot/${sessionId}`
  },

  async streamChat(sessionId, message, history, onToken) {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message, history }),
    })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { detail = (await res.json()).detail || detail } catch (_) {}
      throw new Error(detail)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onToken(decoder.decode(value, { stream: true }))
    }
  },
}
