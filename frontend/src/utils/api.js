// In production, VITE_API_URL points to the Railway backend (set in Vercel env).
// In local dev, it falls back to the Vite proxy at /api.
const API_ROOT = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : ''
const BASE = `${API_ROOT}/api`

export const AUTH_TOKEN_KEY = 'folio_auth_token'

export function getAuthToken() {
  try { return localStorage.getItem(AUTH_TOKEN_KEY) } catch (_) { return null }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
    else localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch (_) {}
}

async function request(path, options = {}) {
  const token = getAuthToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
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

  async getPerformance(sessionId, period = '1y', signal = undefined) {
    const res = await request(
      `/portfolio/${sessionId}/performance?period=${period}`,
      signal ? { signal } : {}
    )
    return res.json()
  },

  async compareETFs(tickers, period = '1y') {
    const res = await request(
      `/market/compare?tickers=${encodeURIComponent(tickers)}&period=${period}`
    )
    return res.json()
  },

  async listScreenerEtfs() {
    const res = await request('/screener/etfs')
    return res.json()
  },

  async getRiskQuestions() {
    const res = await request('/risk/questions')
    return res.json()
  },

  async submitRiskAnswers(answers) {
    const res = await request('/risk/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    return res.json()
  },

  async getMyRiskProfile() {
    const res = await request('/risk/me')
    return res.json()
  },

  async register(email, password) {
    const res = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return res.json()
  },

  async login(email, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    return res.json()
  },

  async getMe() {
    const res = await request('/auth/me')
    return res.json()
  },

  async listPortfolios() {
    const res = await request('/portfolios')
    return res.json()
  },

  async getAccountPortfolio(portfolioId) {
    const res = await request(`/portfolios/${portfolioId}`)
    return res.json()
  },

  async claimPortfolio(sessionId, name) {
    const res = await request('/portfolios/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, name }),
    })
    return res.json()
  },

  async renamePortfolio(portfolioId, name) {
    const res = await request(`/portfolios/${portfolioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return res.json()
  },

  async deletePortfolio(portfolioId) {
    const res = await request(`/portfolios/${portfolioId}`, { method: 'DELETE' })
    return res.json()
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
