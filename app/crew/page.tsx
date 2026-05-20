import { CrewTable } from "@/components/crew-table"

export default function CrewPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Crew Applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, filter, and manage all crew volunteer applications.
          </p>
        </div>
      </div>
      <CrewTable />
    </div>
  )
}
