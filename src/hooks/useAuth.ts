import { useMemo } from 'react'

import { FINANCE_ACCESS_ROLES, FULL_ACCESS_ROLES } from '../constants/roles'
import { useAppSelector } from '../store'
import type { UserRole } from '../types/domain'

export const useAuth = () => {
  const auth = useAppSelector((state) => state.auth)

  return useMemo(
    () => ({
      ...auth,
      hasRole: (roles: UserRole[]) =>
        auth.currentUser ? roles.includes(auth.currentUser.role) : false,
      hasFullAccess: () => (auth.currentUser ? FULL_ACCESS_ROLES.includes(auth.currentUser.role) : false),
      hasFinanceAccess: () => (auth.currentUser ? FINANCE_ACCESS_ROLES.includes(auth.currentUser.role) : false),
    }),
    [auth],
  )
}
