"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Link2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CrewLinkPopoverProps {
  crewList: any[]
  currentCrewId?: string | null
  onLink: (crewId: string) => void
  onUnlink?: () => void
  trigger?: React.ReactNode
}

export function CrewLinkPopover({
  crewList,
  currentCrewId,
  onLink,
  onUnlink,
  trigger,
}: CrewLinkPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = crewList.filter(
    (c) =>
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (crewId: string) => {
    onLink(crewId)
    setOpen(false)
    setSearch("")
  }

  const currentCrew = crewList.find((c) => c.id === currentCrewId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <Link2 className="h-3 w-3" />
            {currentCrew ? `${currentCrew.first_name} ${currentCrew.last_name}` : "Link Crew"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by name..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandEmpty>No crew found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {filtered.map((crew) => (
              <CommandItem
                key={crew.id}
                onSelect={() => handleSelect(crew.id)}
                className="cursor-pointer text-xs"
              >
                <div className="flex w-full items-center justify-between">
                  <span>
                    {crew.first_name} {crew.last_name}
                  </span>
                  {crew.id === currentCrewId && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {currentCrewId && onUnlink && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-destructive"
                onClick={() => {
                  onUnlink()
                  setOpen(false)
                  setSearch("")
                }}
              >
                Unlink Crew
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
