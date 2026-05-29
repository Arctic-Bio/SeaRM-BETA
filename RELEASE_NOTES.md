# SeaRM Release Notes

## v2.1 (Latest) - Comprehensive Audit & Optimization

### Critical Bug Fixes
- ✅ Fixed extension manager crash - `logExtensionAction()` now properly calls `getDb()`
- ✅ Fixed portal crew lifecycle tips - updated references from non-existent `"accepted"` status to correct `"verified"`
- ✅ Fixed import system - replaced stub returning 0 rows with full implementation supporting row mapping, duplicate handling (skip/merge), and per-row error tracking

### Security Enhancements
- ✅ Added API authorization middleware (`requireApiAuth`) to sensitive endpoints
- ✅ Applied `staffOnly` role check to `/api/stats`, `/api/kanban`, `/api/export`, `/api/crew`
- ✅ Added sort parameter validation to prevent SQL injection via `sortOrder` query param
- ✅ Consolidated duplicate database connections - removed redundant `getSqlInstance()` in `auth.ts`
- ✅ Removed dead permission system - all checks now use unified RBAC in `lib/rbac/index.ts`

### UI/UX Improvements
- ✅ Fixed kanban grid layout - changed from hardcoded 8 columns to dynamic column count matching all 10 crew statuses
- ✅ Added position display to crew detail page - shows assigned and preferred positions with joins from positions table
- ✅ Integrated custom fields into crew detail - new "Custom Fields" tab with field grouping and value display
- ✅ Fixed settings page duplicate import - removed unused `Switch as SwitchToggle` alias
- ✅ Removed duplicate Switch import in settings page

### Data & Integration Fixes
- ✅ Fixed availability filter - `availTo` now correctly checks `availability_end_date` instead of comparing against `availability_start_date`
- ✅ Added pronouns to CSV column mapping - supports both "Pronouns" and "Preferred Pronouns" headers
- ✅ Updated crew detail API to join positions table - returns position names alongside crew data
- ✅ Portal onboarding tips aligned with new crew lifecycle statuses

### Performance & Scalability
- ✅ Added kanban pagination - limits to 50 items per column with "+X more in crew table" overflow indicators
- ✅ Dynamic kanban grid layout with horizontal scrolling for large datasets
- ✅ Optimized kanban API to return total counts per status for accurate column headers

### Database Optimization
- ✅ Dropped unused 632 KB GIN index on `application_data` column (never scanned)
- ✅ Reindexed `file_storage` table - recovered 3.4 MB of bloated index space
- ✅ Ran `VACUUM ANALYZE` on 7 tables to reclaim dead rows and update planner statistics
- ✅ Fixed `crew.status` column default to `'application'` (was incorrectly `'new_applicant'`)
- ✅ Updated database check constraint to enforce 10 valid crew statuses

### Code Quality
- ✅ All TypeScript errors resolved
- ✅ All APIs compile successfully
- ✅ Database backups rewritten with proper error handling and parameterized queries
- ✅ Removed placeholder content from backup utilities

### Documentation
- ✅ Updated README.md with new crew lifecycle system
- ✅ Added CONTRIBUTING.md with contribution guidelines
- ✅ Added .env.example with all required environment variables
- ✅ Updated release notes with comprehensive changelog
- ✅ Documented crew lifecycle stages and unified profile model

### Breaking Changes
- None - all changes are backward compatible

### Migration Notes

If upgrading from v2.0, run the following to optimize your database:

```bash
# VACUUM and reclaim dead rows
VACUUM ANALYZE crew;
VACUUM ANALYZE users;
VACUUM ANALYZE positions;
VACUUM ANALYZE tasks;
VACUUM ANALYZE roles;
VACUUM ANALYZE crew_positions;
VACUUM ANALYZE crew_invoices;

# Drop unused index
DROP INDEX idx_crew_application_data;

# Reindex bloated table
REINDEX TABLE file_storage;

# Verify status default
ALTER TABLE crew ALTER COLUMN status SET DEFAULT 'application';
```

---

## v2.0 - Crew Invoicing & Schema Expansion

### Major Features
- **Crew Invoicing System** - CSV position upload, hour tracking, automatic invoice generation
- **Interactive Database Visualization** - Advanced ERD with force-directed layout and draggable nodes
- **Enhanced Admin Tools** - Improved export covering 18+ data sources
- **Database Expansion** - From 33 to 63 tables

### Features
- CSV position upload with validation and duplicate detection
- Hour tracking and verification workflow
- Automatic invoice generation from assignments
- Invoice management (draft → issued → paid)
- Pay configuration and rate management
- Invoice settings with customizable numbering
- CSV upload audit trail

### Technical
- Full TypeScript support
- Modular component architecture
- Optimized query patterns
- Enhanced error handling
- SWR caching for performance

---

## v1.0 - Initial Release

### Core Features
- Crew management with 15-skill rating system
- Fleet and voyage management
- Widget builder for embeddable views
- Extensions system with event hooks
- Email automation
- Live vessel map with weather
- Role-based access control

---

## Upgrading

### From v2.0 to v2.1

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Run database optimizations (see Migration Notes above)

# Restart development server
pnpm dev
```

### From v1.0 to v2.0

```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Database will be migrated on first run
# Monitor application logs for any errors
```

---

## Known Issues

- None currently

## Roadmap

### Planned for v3.0
- Multi-organization support
- Automated daily backups
- Payment processor integration (Stripe/PayPal)
- Mobile native application
- Advanced analytics dashboards
- AI-powered crew matching

### Long-term
- Blockchain document verification
- Real-time collaboration features
- Machine learning crew recommendations
- Predictive voyage planning

---

## Support

- 📖 [Full Documentation](README.md)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
- 🐛 [Report Issues](https://github.com/your-org/searm/issues)
- 💬 [Discussions](https://github.com/your-org/searm/discussions)
- 📧 Email: support@searm.dev

---

**SeaRM - Enterprise Maritime Operations Platform** ⚓
