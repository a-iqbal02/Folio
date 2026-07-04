import { createContext, useState, useEffect, useCallback } from 'react'
import { api, getAuthToken, setAuthToken } from '../utils/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setLoading(false)
      return
    }
    api.getMe()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    setAuthToken(data.access_token)
    setUser(data.user || { id: data.id, email: data.email })
    return data
  }, [])

  const register = useCallback(async (email, password) => {
    const data = await api.register(email, password)
    setAuthToken(data.access_token)
    setUser({ id: data.id, email: data.email })
    return data
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
