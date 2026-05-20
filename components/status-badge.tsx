import { STATUS_LABELS, STATUS_COLORS, type ApplicantStatus } from "@/lib/db"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: ApplicantStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
