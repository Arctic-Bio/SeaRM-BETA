import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entity_type")
  const endpoint = searchParams.get("endpoint")

  // --- List field definitions ---
  if (endpoint === "definitions") {
    const result = entityType
      ? await sql`SELECT * FROM custom_field_definitions WHERE entity_type = ${entityType} AND is_active = true ORDER BY display_order, field_name`
      : await sql`SELECT * FROM custom_field_definitions WHERE is_active = true ORDER BY entity_type, group_name, display_order`
    return NextResponse.json(result)
  }

  // --- Get single definition ---
  if (endpoint === "definition") {
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const result = await sql`SELECT * FROM custom_field_definitions WHERE id = ${id}`
    return NextResponse.json(result[0] || null)
  }

  // --- Get values for entity ---
  if (endpoint === "values") {
    const entity_id = searchParams.get("entity_id")
    const entity_type_param = searchParams.get("entity_type")
    if (!entity_id || !entity_type_param) return NextResponse.json({ error: "entity_id and entity_type required" }, { status: 400 })
    const result = await sql`
      SELECT cfv.*, cfd.field_name, cfd.field_type, cfd.field_key, cfd.group_name
      FROM custom_field_values cfv
      JOIN custom_field_definitions cfd ON cfd.id = cfv.field_id
      WHERE cfv.entity_id = ${entity_id} AND cfv.entity_type = ${entity_type_param}
      ORDER BY cfd.group_name, cfd.display_order
    `
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const body = await req.json()
  const { action } = body

  // --- Create field definition ---
  if (action === "create_definition") {
    const { entity_type, field_name, field_key, field_type, description, placeholder, is_required, options, validation_rules, default_value, display_order, group_name } = body
    if (!entity_type || !field_name || !field_key || !field_type) {
      return NextResponse.json({ error: "entity_type, field_name, field_key, field_type required" }, { status: 400 })
    }
    try {
      const result = await sql`
        INSERT INTO custom_field_definitions
        (entity_type, field_name, field_key, field_type, description, placeholder, is_required, options, validation_rules, default_value, display_order, group_name, created_by)
        VALUES (${entity_type}, ${field_name}, ${field_key}, ${field_type}, ${description || ''}, ${placeholder || ''}, ${is_required || false}, ${JSON.stringify(options || [])}, ${JSON.stringify(validation_rules || {})}, ${default_value || null}, ${display_order || 0}, ${group_name || 'General'}, ${user.id})
        RETURNING *
      `
      return NextResponse.json(result[0], { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Update field definition ---
  if (action === "update_definition") {
    const { id, field_name, description, placeholder, is_required, is_active, options, validation_rules, default_value, display_order, group_name } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    try {
      const result = await sql`
        UPDATE custom_field_definitions
        SET field_name = ${field_name}, description = ${description}, placeholder = ${placeholder}, is_required = ${is_required}, 
            is_active = ${is_active}, options = ${JSON.stringify(options)}, validation_rules = ${JSON.stringify(validation_rules)},
            default_value = ${default_value}, display_order = ${display_order}, group_name = ${group_name}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Delete field definition ---
  if (action === "delete_definition") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    try {
      await sql`DELETE FROM custom_field_definitions WHERE id = ${id}`
      return NextResponse.json({ success: true })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Set field value for entity ---
  if (action === "set_value") {
    const { field_id, entity_type, entity_id, value } = body
    if (!field_id || !entity_type || !entity_id) {
      return NextResponse.json({ error: "field_id, entity_type, entity_id required" }, { status: 400 })
    }
    try {
      // Get field definition to know the type
      const defResult = await sql`SELECT field_type FROM custom_field_definitions WHERE id = ${field_id}`
      if (!defResult.length) return NextResponse.json({ error: "Field not found" }, { status: 404 })
      const fieldType = defResult[0].field_type

      // Build insert/upsert based on field type
      const valueMap: any = {
        value_text: null, value_number: null, value_date: null, value_boolean: null, value_json: null
      }
      if (fieldType === 'number' || fieldType === 'currency') valueMap.value_number = Number(value)
      else if (fieldType === 'date') valueMap.value_date = value
      else if (fieldType === 'boolean') valueMap.value_boolean = value === true || value === 'true'
      else if (['select', 'multi_select', 'file'].includes(fieldType)) valueMap.value_json = JSON.stringify(value)
      else valueMap.value_text = String(value)

      const result = await sql`
        INSERT INTO custom_field_values (field_id, entity_type, entity_id, ${Object.keys(valueMap).filter(k => valueMap[k] !== null).map((k, i) => `"${k}"`).join(', ')}, updated_by, updated_at)
        VALUES (${field_id}, ${entity_type}, ${entity_id}, ${Object.values(valueMap).filter(v => v !== null).map((v, i) => v).join(', ')}, ${user.id}, now())
        ON CONFLICT (field_id, entity_id) DO UPDATE SET ${Object.keys(valueMap).filter(k => valueMap[k] !== null).map(k => `"${k}" = excluded."${k}"`).join(', ')}, updated_by = ${user.id}, updated_at = now()
        RETURNING *
      `
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
