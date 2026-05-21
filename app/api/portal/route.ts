import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const crewId = session.crew_id
    if (!crewId) return NextResponse.json({ profile: null, assignments: [], requirements: [], documents: [], tips: [], requiredDocuments: [], tasks: [] })

    // Profile
    const profileRows = await sql`SELECT * FROM crew_applications WHERE id = ${crewId}`
    const profile = profileRows[0] || null

    // Active voyage assignments with correct column names
    const assignments = await sql`
      SELECT ca.id, ca.status, ca.role,
        v.voyage_name, v.departure_date as start_date, v.return_date as end_date, v.status as voyage_status,
        v.departure_port, v.destination_port, v.mission_type,
        s.name as ship_name, s.type as vessel_type,
        cp.position_name as position_title
      FROM crew_assignments ca
      JOIN voyages v ON ca.voyage_id = v.id
      LEFT JOIN ships s ON v.ship_id = s.id
      LEFT JOIN crew_positions cp ON ca.position_id = cp.id
      WHERE ca.crew_id = ${crewId}
      ORDER BY v.departure_date DESC
      LIMIT 10
    `

    // Onboarding checklists (items stored as JSONB array in the items column)
    const checklists = await sql`
      SELECT id, template_name, items, progress, status
      FROM onboarding_checklists
      WHERE crew_id = ${crewId}
      ORDER BY created_at DESC
    `
    // Flatten JSONB items into a flat requirements list
    const requirements: any[] = []
    for (const cl of checklists) {
      const items = Array.isArray(cl.items) ? cl.items : []
      for (const item of items) {
        requirements.push({
          id: `${cl.id}-${item.key}`,
          checklist_id: cl.id,
          checklist_name: cl.template_name,
          title: item.label || item.key,
          completed: !!item.done,
          key: item.key,
        })
      }
    }

    // Auto-provision crew copies for global documents
    const globalDocs = await sql`
      SELECT id, document_type, file_name, mime_type, file_size, uploaded_by, requires_signature, notes, created_at
      FROM file_storage
      WHERE is_global = true AND global_source_id IS NULL
    `
    if (globalDocs.length > 0) {
      // Find which global docs this crew member already has a copy of
      const existingCopies = await sql`
        SELECT global_source_id FROM file_storage
        WHERE crew_id = ${crewId} AND global_source_id IS NOT NULL
      `
      const existingSourceIds = new Set(existingCopies.map((r: any) => r.global_source_id))
      // Create missing copies (lightweight -- no file_data, references global source)
      for (const gd of globalDocs) {
        if (!existingSourceIds.has(gd.id)) {
          try {
            const docType = gd.document_type || "document"
            const fileName = gd.file_name || "document"
            const mimeType = gd.mime_type || "application/octet-stream"
            const fileSize = gd.file_size ? Number(gd.file_size) : 0
            const uploadedBy = gd.uploaded_by || "system"
            const reqSig = gd.requires_signature === true
            const gdNotes = gd.notes || null
            await sql`
              INSERT INTO file_storage (
                crew_id, document_type, file_name, mime_type, file_size,
                uploaded_by, requires_signature, is_global, global_source_id, notes
              ) VALUES (
                ${crewId}, ${docType}, ${fileName}, ${mimeType}, ${fileSize},
                ${uploadedBy}, ${reqSig}, false, ${gd.id}, ${gdNotes}
              )
            `
          } catch {
            // Skip if provisioning fails (e.g. duplicate)
          }
        }
      }
    }

    // Documents (now includes auto-provisioned global copies)
    const documents = await sql`
      SELECT id, document_type, file_name, mime_type, file_size, uploaded_by, verified, verified_by, verified_at,
        expiry_date, notes, created_at, requires_signature, signed_by, signed_at, signature_name, signature_type,
        global_source_id
      FROM file_storage
      WHERE crew_id = ${crewId}
      ORDER BY created_at DESC
    `

    // Tasks assigned to this crew member
    const tasks = await sql`
      SELECT id, title, description, status, priority, due_date, created_at
      FROM tasks
      WHERE crew_id = ${crewId}
      ORDER BY CASE WHEN status = 'completed' THEN 1 ELSE 0 END, due_date ASC NULLS LAST
    `

    // Required documents list from site_settings
    const reqDocRows = await sql`SELECT value FROM site_settings WHERE key = 'required_documents'`
    let requiredDocuments: any[] = []
    try {
      requiredDocuments = reqDocRows.length ? JSON.parse(reqDocRows[0].value as string) : []
    } catch { requiredDocuments = [] }

    // Compute which required docs are fulfilled
    const fulfilledTypes = new Set(documents.map((d: any) => d.document_type))
    const requiredWithStatus = requiredDocuments.map((rd: any) => ({
      ...rd,
      fulfilled: fulfilledTypes.has(rd.type),
      verified: documents.some((d: any) => d.document_type === rd.type && d.verified),
      expired: documents.some((d: any) => d.document_type === rd.type && d.expiry_date && new Date(d.expiry_date as string) < new Date()),
    }))

    // Required e-signature documents
    const reqEsignRows = await sql`SELECT value FROM site_settings WHERE key = 'required_esign_documents'`
    let requiredEsignDocuments: any[] = []
    try {
      requiredEsignDocuments = reqEsignRows.length ? JSON.parse(reqEsignRows[0].value as string) : []
    } catch { requiredEsignDocuments = [] }

    // Compute which e-sign docs are fulfilled (uploaded + requires_signature + signed)
    const esignWithStatus = requiredEsignDocuments.map((rd: any) => {
      const matchingDoc = documents.find((d: any) => d.document_type === rd.type && d.requires_signature)
      return {
        ...rd,
        uploaded: !!matchingDoc,
        signed: !!matchingDoc?.signed_by,
        signed_at: matchingDoc?.signed_at || null,
        signature_name: matchingDoc?.signature_name || null,
        doc_id: matchingDoc?.id || null,
        file_name: matchingDoc?.file_name || null,
        is_global: !!matchingDoc?.global_source_id,
      }
    })

    // Also find global docs requiring signature that aren't in the required_esign list
    const globalSignDocs = documents.filter((d: any) =>
      d.global_source_id && d.requires_signature && !esignWithStatus.some((e: any) => e.doc_id === d.id)
    ).map((d: any) => ({
      type: d.document_type,
      label: d.notes || d.file_name,
      description: "Global document requiring your signature",
      uploaded: true,
      signed: !!d.signed_by,
      signed_at: d.signed_at || null,
      signature_name: d.signature_name || null,
      doc_id: d.id,
      file_name: d.file_name,
      is_global: true,
    }))

    // Compute completed onboarding items
    const completedReqs = requirements.filter((r: any) => r.completed)

    // Onboarding timeline stages (computed from profile status + data completeness)
    const onboardingStages = [
      {
        key: "application",
        label: "Application Submitted",
        description: "Your application has been received",
        completed: true,
        date: profile?.created_at || null,
      },
      {
        key: "reviewed",
        label: "Application Reviewed",
        description: "Your application has been reviewed by the team",
        completed: ["reviewed", "awaiting_interview", "interview_completed", "candidate", "approved", "confirmed"].includes(profile?.status),
        date: profile?.updated_at && profile?.status !== "new_applicant" ? profile?.updated_at : null,
      },
      {
        key: "interview",
        label: "Interview",
        description: "Interview process completed",
        completed: ["interview_completed", "candidate", "approved", "confirmed"].includes(profile?.status),
        date: null,
      },
      {
        key: "approved",
        label: "Approved",
        description: "You have been approved to join",
        completed: ["approved", "confirmed"].includes(profile?.status),
        date: null,
      },
      {
        key: "documents",
        label: "Documents Submitted",
        description: `${requiredWithStatus.filter((r: any) => r.fulfilled).length}/${requiredWithStatus.length} required documents uploaded`,
        completed: requiredWithStatus.length > 0 && requiredWithStatus.every((r: any) => r.fulfilled),
        date: null,
      },
      {
        key: "esign",
        label: "E-Signatures Complete",
        description: `${esignWithStatus.filter((e: any) => e.signed).length}/${esignWithStatus.length} documents signed`,
        completed: esignWithStatus.length > 0 && esignWithStatus.every((e: any) => e.signed),
        date: null,
      },
      {
        key: "onboarding",
        label: "Onboarding Complete",
        description: `${completedReqs.length}/${requirements.length} checklist items done`,
        completed: requirements.length > 0 && completedReqs.length === requirements.length,
        date: null,
      },
      {
        key: "confirmed",
        label: "Confirmed & Ready",
        description: "You are confirmed and ready for deployment",
        completed: profile?.status === "confirmed",
        date: null,
      },
    ]

    // Build tips
    const tips: string[] = []
    if (profile) {
      if (profile.status === "applied") tips.push("Your application is being reviewed. Make sure all required documents are uploaded.")
      if (profile.status === "screening") tips.push("You are in the screening phase. Ensure your certifications are current.")
      if (profile.status === "accepted") tips.push("Congratulations on being accepted! Complete your onboarding checklist items.")
      if (!profile.maritime_qualifications) tips.push("Add your maritime qualifications to strengthen your profile.")
      const missingRequired = requiredWithStatus.filter((r: any) => !r.fulfilled)
      if (missingRequired.length > 0) tips.push(`You are missing ${missingRequired.length} required document(s): ${missingRequired.map((r: any) => r.label).join(", ")}.`)
      const expiredDocs = documents.filter((d: any) => d.expiry_date && new Date(d.expiry_date as string) < new Date())
      if (expiredDocs.length > 0) tips.push(`You have ${expiredDocs.length} expired document(s). Please renew them.`)
      const unsignedEsignReqs = esignWithStatus.filter((e: any) => e.uploaded && !e.signed)
      if (unsignedEsignReqs.length > 0) tips.push(`You have ${unsignedEsignReqs.length} required e-signature document(s) awaiting your signature: ${unsignedEsignReqs.map((e: any) => e.label).join(", ")}.`)
      const missingEsignDocs = esignWithStatus.filter((e: any) => !e.uploaded)
      if (missingEsignDocs.length > 0) tips.push(`${missingEsignDocs.length} required e-signature document(s) have not been uploaded yet: ${missingEsignDocs.map((e: any) => e.label).join(", ")}. Your coordinator will upload these for you.`)
      const unsigned = documents.filter((d: any) => d.requires_signature && !d.signed_by)
      if (unsigned.length > 0) tips.push(`You have ${unsigned.length} document(s) awaiting your signature.`)
      const pendingTasks = tasks.filter((t: any) => t.status !== "completed")
      if (pendingTasks.length > 0) tips.push(`You have ${pendingTasks.length} pending task(s) to complete.`)
    }

    return NextResponse.json({ profile, assignments, requirements, documents, tips, requiredDocuments: requiredWithStatus, tasks, requiredEsignDocuments: [...esignWithStatus, ...globalSignDocs], onboardingStages })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
