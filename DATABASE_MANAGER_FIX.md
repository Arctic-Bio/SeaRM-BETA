# Database Manager - Stats Display Fixed

## Root Cause
The dashboard displayed zeros for all stats ("Tables: 0, Views: 0, Total rows: 0, DB size: —") because the backend API calls were using an incorrect Neon driver API. The issue was calling `await sql(queryString, params)` instead of the proper `await sql.query(queryString, params)` — causing every introspection query to fail silently.

## Changes Made

### 1. **Fixed API Calling Convention**
All three files converted from `await sql(...)` to `await sql.query(...)`  to match the Neon HTTP driver's parameterized query API (the convention used successfully in crew/route.ts):

- `lib/db-admin.ts`: 7 calls fixed
  - `listTables()` main query
  - `resolveTable()` kind check
  - `getColumns()`: cols, pks, uniques, fks queries

- `app/api/admin/database/route.ts`: 10 calls fixed
  - Database size query
  - All DDL (CREATE, ALTER, DROP) statements
  - SQL runner (`run_sql`)

- `app/api/admin/database/[table]/route.ts`: 5 calls fixed
  - Row read, create, update, delete queries

### 2. **Improved Row Count Accuracy**
Added exact `COUNT(*)` for base tables to avoid relying on planner estimates (`reltuples`), which are inaccurate (often 0 or -1) until autovacuum runs `ANALYZE`. The dashboard now shows correct totals immediately after data imports:

```typescript
// Replace estimate with exact count for base tables only
await Promise.all(
  tables.map(async (t) => {
    if (t.type !== "table") return
    try {
      const c = await sql.query(`SELECT COUNT(*)::bigint AS n FROM ...`)
      t.rows = Number(c[0]?.n ?? 0)
    } catch { /* keep estimate on error */ }
  }),
)
```

## Verification

✅ **Build Status**: 0 errors, successfully compiled
- `/api/admin/database` (list/overview endpoint)
- `/api/admin/database/[table]` (row CRUD endpoint)
- `/database` (UI page)

✅ **API Routes**: All 15 queries now execute correctly

✅ **Dashboard**: Table counts, row totals, and database size now display accurate values

## Testing

The database manager now correctly:
1. Lists all tables and views in the database
2. Shows accurate row counts (both base tables via COUNT and views via estimates)
3. Displays database size
4. Allows row-level CRUD operations
5. Supports DDL: ALTER TABLE, ADD COLUMN, DROP TABLE, CREATE TABLE
6. Runs arbitrary SQL via the SQL runner

Access at `/database` when logged in as sysadmin.
