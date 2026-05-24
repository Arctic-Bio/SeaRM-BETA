import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

/**
 * Hook to fetch custom field definitions for an entity type
 */
export function useCustomFieldDefinitions(entityType: string) {
  const { data, isLoading, error, mutate } = useSWR(
    `/api/custom-fields?endpoint=definitions&entity_type=${entityType}`,
    fetcher
  )
  return { definitions: data || [], isLoading, error, mutate }
}

/**
 * Hook to fetch custom field values for a specific entity
 */
export function useCustomFieldValues(entityType: string, entityId: string | null) {
  const { data, isLoading, error, mutate } = useSWR(
    entityId ? `/api/custom-fields?endpoint=values&entity_type=${entityType}&entity_id=${entityId}` : null,
    fetcher
  )
  return { values: data || [], isLoading, error, mutate }
}

/**
 * Set a custom field value for an entity
 */
export async function setCustomFieldValue(fieldId: string, entityType: string, entityId: string, value: any) {
  const res = await fetch('/api/custom-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'set_value',
      field_id: fieldId,
      entity_type: entityType,
      entity_id: entityId,
      value,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * Format custom field value for display
 */
export function formatCustomFieldValue(value: any, fieldType: string): string {
  if (!value) return '—'
  switch (fieldType) {
    case 'boolean':
      return value ? '✓' : '✗'
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value)
    case 'date':
      return new Date(value).toLocaleDateString()
    case 'multi_select':
      return Array.isArray(value) ? value.join(', ') : String(value)
    default:
      return String(value)
  }
}

/**
 * Get custom field value from values array
 */
export function getCustomFieldValue(values: any[], fieldKey: string): any {
  const field = values.find(v => v.field_key === fieldKey)
  if (!field) return null
  
  switch (field.field_type) {
    case 'number':
    case 'currency':
      return field.value_number
    case 'date':
      return field.value_date
    case 'boolean':
      return field.value_boolean
    case 'select':
    case 'multi_select':
    case 'file':
      return field.value_json ? JSON.parse(field.value_json) : null
    default:
      return field.value_text
  }
}
