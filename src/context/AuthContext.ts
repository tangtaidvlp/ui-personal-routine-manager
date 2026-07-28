import { createContext, type Dispatch, type SetStateAction } from 'react'

export type AuthUser = {
  id?: string
  email?: string
  name: string
} | null

type AuthContextValue = {
  user: AuthUser
  setUser: Dispatch<SetStateAction<AuthUser>>
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue)

export default AuthContext