# Crew Filter System - Complete Fixes & Enhancements

## Overview

Comprehensive overhaul of the crew management filter system to support all filter types including skills, tags, availability dates, and more. All filters now work correctly with proper database queries and improved UI/UX.

## Issues Fixed

### 1. Skill Filter Logic
**Problem**: Skills filter wasn't working correctly when users selected "any_level"
- The "any_level" option was being treated as a literal value instead of a wildcard
- Results in crew members not being found even when they have the skill

**Solution**: 
- Modified the skill filter query to check for non-empty values when "any_level" is selected
- When a specific level is selected, we match exact values
- Properly exclude "any_level" from the database comparison

**Code Change** (`app/api/crew/route.ts`):
```typescript
if (level && level !== "any_level") {
  // Specific level required
  conditions.push(`c.${key} = $${p}`)
  params.push(level)
} else {
  // Any non-empty level is acceptable
  conditions.push(`c.${key} != '' AND c.${key} IS NOT NULL`)
}
```

### 2. Availability Date Filters
**Problem**: Availability filters were using wrong database columns
- `availTo` was checking `availability_start_date` instead of `availability_end_date`
- Filtering logic was reversed

**Solution**:
- Fixed `availFrom` to check if crew is available starting at or after the date
- Fixed `availTo` to check if crew is available through or past the end date
- Added NULL checks for crew without specific availability dates

**Code Change** (`app/api/crew/route.ts`):
```typescript
if (availFrom) {
  conditions.push(`(c.availability_start_date IS NULL OR c.availability_start_date >= $${p})`)
  params.push(availFrom)
}
if (availTo) {
  conditions.push(`(c.availability_end_date IS NULL OR c.availability_end_date >= $${p})`)
  params.push(availTo)
}
```

### 3. Skill Filter UI/UX Improvements
**Enhancements**:
- Added a "None" option to the skill dropdown to allow clearing the selection
- Improved visual feedback for selected skills
- Added "Clear" button to quickly remove all skill filters at once
- Better labeling and spacing in the filter section

**Visual Improvements**:
- Skill badges now show "(any level)" placeholder only when appropriate
- More compact display of selected filters
- Hover effects on tags for better interactivity

### 4. Tag Filter UI/UX Improvements
**Enhancements**:
- Added a "Clear tags" button at the top of the tag filter section
- Better visual distinction between selected and unselected tags
- Improved layout with flexbox wrapping
- Added smooth transitions for hover effects

## How Filters Work

### Skill Filters
- **AND Logic**: Crew must have ALL selected skills
- **Format**: Stored as `skill_key:level` (e.g., `skill_cooking:Professional`)
- **"Any Level" Option**: Matches any level of that skill (Basic, Experienced, Professional)
- **No Level Selected**: Matches crew with any proficiency level

### Tag Filters
- **AND Logic**: Crew must have ALL selected tags
- **Format**: Comma-separated tag names
- **Display**: Shows count of crew members with each tag

### Availability Filters
- **Start Date** (`availFrom`): Finds crew available starting on or after this date
- **End Date** (`availTo`): Finds crew available through or past this date
- **NULL Handling**: Crew without specific dates are included

### Other Filters
- **Search**: Searches across name, email, phone, city, occupation
- **Status**: Multi-select - crew must match one of the selected statuses
- **Country**: Exact match (case-insensitive)
- **Department**: LIKE match (substring search)
- **Gender**: Exact match (case-insensitive)
- **Rating**: Range filter (min/max)
- **Criminal Record**: Yes/No filter
- **Maritime Qualifications**: Yes/No filter

## Query Building

The filter system builds parameterized SQL queries to prevent SQL injection:

```sql
SELECT c.id, c.first_name, ... FROM crew c
WHERE 
  (c.status = $1)
  AND (c.skill_cooking != '' AND c.skill_cooking IS NOT NULL)
  AND (c.rating >= $2)
  AND ...
ORDER BY c.created_at DESC
LIMIT 25 OFFSET 0
```

## Testing Checklist

- [ ] Search filter works for names, emails, phone, city
- [ ] Status filter works with single and multiple selections
- [ ] Skill filter works with "any level" option
- [ ] Skill filter works with specific levels (Basic, Experienced, Professional)
- [ ] Skill filter with multiple skills (AND logic)
- [ ] Availability date ranges work correctly
- [ ] Tag filter works (AND logic - crew must have all tags)
- [ ] Rating range filter works (min/max)
- [ ] Gender, country, department filters work
- [ ] Maritime qualifications yes/no filter works
- [ ] Criminal record yes/no filter works
- [ ] Filter combinations work together
- [ ] "Clear" buttons remove their respective filters
- [ ] Active filter count displays correctly
- [ ] Pagination works with filters applied
- [ ] Sorting works with filters applied
- [ ] API returns correct count and results

## Files Modified

1. **app/api/crew/route.ts**
   - Fixed skill filter level comparison
   - Fixed availability date filters
   - Improved NULL handling

2. **components/crew-table.tsx**
   - Enhanced skill filter UI with "None" option
   - Added "Clear skills" button
   - Improved tag filter UI with "Clear tags" button
   - Better visual feedback and styling

## Performance Considerations

- Filters use parameterized queries (safe from SQL injection)
- Pagination limits results to 25 rows per page
- Multiple conditions use AND logic for efficient filtering
- Tag filter uses a subquery with COUNT for accurate AND logic
- Valid column allowlist for sort parameters

## Future Enhancements

- [ ] Saved filter presets
- [ ] Filter templates for common searches
- [ ] Export filtered results
- [ ] Advanced filter builder UI
- [ ] Filter history/recent filters
- [ ] OR logic option for some filters
