import { usePermission } from '@/hooks/use-permission'
import { AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  permission: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function ProtectedRoute({ permission, fallback, children }: ProtectedRouteProps) {
  const { hasPermission, canAny } = usePermission()

  const hasAccess = Array.isArray(permission) ? canAny(permission) : hasPermission(permission)

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border border-dashed">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground font-medium">Access Denied</p>
          <p className="text-xs text-muted-foreground">You don't have permission to view this content</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
