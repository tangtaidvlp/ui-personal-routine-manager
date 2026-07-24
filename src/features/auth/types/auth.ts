export type AuthMode = 'signin' | 'signup'

export type AuthUser = {
  id: string
  email: string
} | null