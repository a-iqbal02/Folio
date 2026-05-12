import { useState, useEffect } from 'react'

const SESSION_KEY = 'portfoliolens_sessions'
const MAX_SAVED = 5

export function useSavedSessions() {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setSessions(JSON.parse(raw))
    } catch (_) {}
  }, [])

  function saveSession(sessionId, analytics, filename) {
    const entry = {
      sessionId,
      filename: filename || 'Portfolio',
      totalValue: analytics?.summary?.total_value,
      holdings: analytics?.summary?.total_holdings,
      savedAt: new Date().toISOString(),
    }
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.sessionId !== sessionId)
      const updated = [entry, ...filtered].slice(0, MAX_SAVED)
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)) } catch (_) {}
      return updated
    })
  }

  function removeSession(sessionId) {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.sessionId !== sessionId)
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)) } catch (_) {}
      return updated
    })
  }

  return { sessions, saveSession, removeSession }
}
