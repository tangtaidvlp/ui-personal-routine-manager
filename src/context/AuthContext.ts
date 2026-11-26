import { createContext } from 'react'

export type AuthUser = {
  id?: string
  email?: string
  name: string
} | null

type AuthContextValue = {
  user: AuthUser
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue)

export default AuthContext
