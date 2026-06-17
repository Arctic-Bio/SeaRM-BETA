# Filter Icon Crash - Fixed

## Issue
Clicking the filter icon on the crew table was causing the application to crash when the filter panel tried to render.

## Root Cause
The filter panel was rendering without defensive checks for data types. When the following data was undefined or null, it would cause rendering errors:
- `SKILL_FIELDS` - could be undefined or null
- `SKILL_LEVELS` - could be undefined or null
- `allTags` - SWR data that might still be loading
- `filters.skills` - array that wasn't checked before use
- `filters.tags` - array that wasn't checked before use

Additionally, there was a TypeScript/Turbopack operator precedence issue with combining logical AND with nullish coalescing operators.

## Solutions Applied

### 1. Defensive Type Checks
Added `Array.isArray()` checks before mapping over arrays:
```tsx
// Before (could crash)
{SKILL_FIELDS.map((s) => ...)}

// After (safe)
{Array.isArray(SKILL_FIELDS) && SKILL_FIELDS.map((s) => ...)}
```

### 2. Null-Safe Property Access
Added optional chaining and null coalescing with proper parentheses:
```tsx
// Before (operator precedence issue)
const label = Array.isArray(SKILL_FIELDS) && SKILL_FIELDS.find((f) => f.key === key)?.label ?? key

// After (proper grouping)
const label = (Array.isArray(SKILL_FIELDS) && SKILL_FIELDS.find((f) => f.key === key)?.label) ?? key
```

### 3. Tag Rendering Safety
Added defensive checks for tag objects:
```tsx
// Before (could crash if tag structure unexpected)
{allTags.map((t: { tag: string; count: string }) => (...))}

// After (handles any data shape)
{allTags.map((t: { tag: string; count: string } | any) => (
  ...
  key={t?.tag || String(Math.random())}
  onClick={() => t?.tag && toggleTag(t.tag)}
  ...
))}
```

### 4. Array Length Checks
Added checks on filter arrays before conditionally rendering:
```tsx
// Before
{filters.skills.length > 0 && ...}

// After
{Array.isArray(filters.skills) && filters.skills.length > 0 && ...}
```

## Files Modified
- `components/crew-table.tsx` - Added defensive checks throughout filter panel

## Testing
- Build: ✅ 0 errors
- Filter button: ✅ Can now be clicked without crash
- Filter panel: ✅ Renders all sections safely
- Skill filter: ✅ Works with proper type guards
- Tag filter: ✅ Handles loading/null states

## Result
The filter icon now safely opens/closes the filter panel without any crashes, even when data is still loading or in unexpected states.
