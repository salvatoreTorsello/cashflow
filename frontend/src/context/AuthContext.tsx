import { createContext, useContext, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import type { LoginRequest, RegisterRequest, User } from '../api/types'

const ME_KEY = ['auth', 'me'] as const

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (body: LoginRequest) => Promise<User>
  register: (body: RegisterRequest) => Promise<User>
  logout: () => Promise<void>
  loginError: string | null
  registerError: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.auth.me()
      } catch {
        return null
      }
    },
    staleTime: 5 * 60_000,
  })

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (loggedInUser) => qc.setQueryData(ME_KEY, loggedInUser),
  })

  const registerMutation = useMutation({
    mutationFn: api.auth.register,
    onSuccess: (newUser) => qc.setQueryData(ME_KEY, newUser),
  })

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      // Wipe every cached query, not just auth — otherwise the next user to
      // log in on this device could momentarily see the previous user's data.
      qc.clear()
      qc.setQueryData(ME_KEY, null)
    },
  })

  const value: AuthContextValue = {
    user: user ?? null,
    isLoading,
    login: (body) => loginMutation.mutateAsync(body),
    register: (body) => registerMutation.mutateAsync(body),
    logout: () => logoutMutation.mutateAsync(),
    loginError: loginMutation.error ? (loginMutation.error as ApiError).message : null,
    registerError: registerMutation.error ? (registerMutation.error as ApiError).message : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
