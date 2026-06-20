import type { UserRole } from '../types/domain'

export const ALL_USER_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER']

export const FULL_ACCESS_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY']

export const FINANCE_ACCESS_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER']

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'පරිපාලක',
  PRESIDENT: 'සභාපති',
  SECRETARY: 'ලේකම්',
  TREASURER: 'භාණ්ඩාගාරික',
  MEMBER: 'සාමාජික',
}

export const DEFAULT_LOGIN_EMAILS: Record<Lowercase<UserRole>, string> = {
  admin: 'admin@samithiya.lk',
  president: 'president@samithiya.lk',
  secretary: 'secretary@samithiya.lk',
  treasurer: 'treasurer@samithiya.lk',
  member: 'member@samithiya.lk',
}
