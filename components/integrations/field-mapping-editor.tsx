"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ArrowRight, Wand2 } from "lucide-react"
import { CREW_TARGET_FIELDS, FULL_NAME_TARGET, TARGET_FIELD_GROUPS, type FieldMapRule } from "@/lib/integrations/types"

interface Props {
  rules: FieldMapRule[]
  onChange: (rules: FieldMapRule[]) => void
}

export function FieldMappingEditor({ rules, onChange }: Props) {
  const update = (i: number, patch: Partial<FieldMapRule>) => {
    const next = rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    onChange(next)
  }
  const add = () => onChange([...rules, { source: "", target: "" }])
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-lg border border-chart-4/25 bg-chart-4/5 p-3">
        <Wand2 className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Map each incoming form field to a crew profile field. Enter the form field&apos;s exact label or key on the left.
          Anything you leave unmapped is still captured in the profile&apos;s raw application data. With <span className="font-medium text-foreground">Auto-map</span> enabled,
          common fields (name, email, phone, skills&hellip;) are detected automatically even without rules.
        </p>
      </div>

      {rules.length > 0 && (
        <div className="flex flex-col gap-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={rule.source}
                onChange={(e) => update(i, { source: e.target.value })}
                placeholder="Form field label, e.g. 'Email Address'"
                className="h-8 text-xs flex-1"
              />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={rule.target || "__ignore__"} onValueChange={(v) => update(i, { target: v === "__ignore__" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Crew field" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ignore__" className="text-xs text-muted-foreground">Ignore this field</SelectItem>
                  <SelectItem value={FULL_NAME_TARGET.key} className="text-xs">{FULL_NAME_TARGET.label}</SelectItem>
                  {TARGET_FIELD_GROUPS.map((group) => (
                    <SelectGroup key={group}>
                      <SelectLabel className="text-[10px] uppercase tracking-wide">{group}</SelectLabel>
                      {CREW_TARGET_FIELDS.filter((f) => f.group === group).map((f) => (
                        <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={add} className="gap-1.5 self-start">
        <Plus className="h-3.5 w-3.5" />Add Mapping Rule
      </Button>
    </div>
  )
}
