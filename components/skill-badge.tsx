import { cn } from "@/lib/utils"

interface SkillBadgeProps {
  label: string
  level: string
}

const levelStyles: Record<string, string> = {
  Basic: "bg-muted text-muted-foreground border-border",
  Experienced: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  Professional: "bg-primary/15 text-primary border-primary/25",
}

export function SkillBadge({ label, level }: SkillBadgeProps) {
  if (!level) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        levelStyles[level] || "bg-muted text-muted-foreground border-border"
      )}
    >
      <span>{label}</span>
      <span className="opacity-60">&middot;</span>
      <span className="opacity-75">{level}</span>
    </span>
  )
}
