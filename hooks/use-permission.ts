import { useAuth } from '@/components/auth-provider'

export function usePermission() {
  const { permissions, hasPermission } = useAuth()
  
  return {
    permissions,
    hasPermission,
    can: (permission: string) => hasPermission(permission),
    canAny: (perms: string[]) => perms.some(p => hasPermission(p)),
    canAll: (perms: string[]) => perms.every(p => hasPermission(p)),
  }
}
