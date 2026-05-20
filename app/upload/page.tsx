import { CsvUploader } from "@/components/csv-uploader"

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upload Crew Applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import crew application data from CSV files exported from your Google
          Form.
        </p>
      </div>
      <CsvUploader />
    </div>
  )
}
