import type { UserRole } from '../types/domain'

export const ALL_USER_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER']

export const FULL_ACCESS_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY']

export const FINANCE_ACCESS_ROLES: UserRole[] = ['ADMIN', 'PRESIDENT', 'SECRETARY', 'TREASURER']

export const CONSTITUTION_MANAGE_ROLES: UserRole[] = ['ADMIN', 'SECRETARY']

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

export const getProfileUpdateApproverRoles = (requesterRole: UserRole): UserRole[] => {
  switch (requesterRole) {
    case 'PRESIDENT':
      return ['ADMIN', 'SECRETARY']
    case 'SECRETARY':
      return ['ADMIN', 'PRESIDENT']
    case 'ADMIN':
      return ['PRESIDENT', 'SECRETARY']
    case 'TREASURER':
    case 'MEMBER':
    default:
      return FULL_ACCESS_ROLES
  }
}

export const canApproveProfileUpdateRequest = (
  reviewerRole: UserRole,
  requesterRole: UserRole,
  isSelfRequest: boolean,
) => {
  if (isSelfRequest) {
    return false
  }

  return getProfileUpdateApproverRoles(requesterRole).includes(reviewerRole)
}
