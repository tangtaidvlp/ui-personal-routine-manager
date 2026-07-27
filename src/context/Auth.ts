import { createContext } from 'react'

export type AuthUser = {
  id?: string
  email?: string
} | null

export type AuthContextValue = {
  user: AuthUser
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export default AuthContext