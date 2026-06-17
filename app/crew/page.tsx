"use client"

import { useState } from "react"
import { CrewTable } from "@/components/crew-table"
import { AddCrewDialog } from "@/components/add-crew-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function CrewPage() {
  const [addCrewOpen, setAddCrewOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Crew Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all crew members, from new applications to active volunteers.
          </p>
        </div>
        <Button onClick={() => setAddCrewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Crew Member
        </Button>
      </div>
      <CrewTable />
      <AddCrewDialog open={addCrewOpen} onClose={() => setAddCrewOpen(false)} />
    </div>
  )
}
