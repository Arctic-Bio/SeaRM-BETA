# SeaRM v2.0 - Release Summary

## What's New in This Release

### Major Features Added

#### 1. Crew Invoicing System
- **CSV Position Upload** - Bulk import crew positions with validation and duplicate detection
- **Hour Tracking** - Log, track, and verify crew working hours with rate management
- **Automatic Invoice Generation** - Create invoices from assignments and verified hours
- **Invoice Management** - Full lifecycle: draft → issued → paid with audit trail
- **Pay Configuration** - Flexible hourly/daily rates per position type
- **Invoice Settings** - Customizable numbering, templates, company branding
- **CSV Upload Audit** - Complete history of all uploads with error tracking

#### 2. Interactive Database Schema Visualization
- **Advanced ERD Diagram** - Visual representation of all 63 database tables
- **Color-Coded Entities** - Organized by category (credentials, profiles, operations, etc.)
- **Draggable Nodes** - Reposition entities on canvas for custom layouts
- **Relationship Visualization** - View all foreign key connections with column details
- **Admin-Only Access** - Restricted to sysadmin users with proper permissions
- **Export Capability** - Download diagrams as images for documentation

#### 3. Enhanced Admin Tools
- Database schema visualization with force-directed layout
- Improved data export system covering all 63 tables
- Better query builder interface with relationship mapping

### Database Expansion
- **Previous**: 33 tables
- **Current**: 63 tables (+30 new tables)
- **New Domains**: Invoicing, Advanced Crew Operations, Enhanced System Audit

### Technical Improvements
- Full TypeScript support for new modules
- Modular component architecture for invoicing UI
- Optimized query patterns for invoice generation
- Enhanced API error handling and validation
- SWR caching for performance optimization

## Deployment Ready

✅ All code is production-ready
✅ Environment variables documented
✅ Database schema complete
✅ API endpoints tested
✅ UI fully responsive and accessible
✅ Documentation updated

## Installation

```bash
# Clone and setup
git clone https://github.com/your-org/searm.git
cd searm
pnpm install

# Configure environment
cp .env.example .env.local
# Edit with your DATABASE_URL and AUTH_SECRET

# Initialize database
pnpm run db:init

# Start development
pnpm dev
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy (automatic on git push)

### Docker
```bash
docker build -t searm .
docker run -e DATABASE_URL="..." -e AUTH_SECRET="..." -p 3000:3000 searm
```

### Linux/Ubuntu
Follow the complete deployment guide in [DEPLOYMENT.md](DEPLOYMENT.md)

## Key Components

### Frontend
- **Next.js 16** with App Router
- **React 19.2** with latest hooks
- **TypeScript 5.7** for type safety
- **Tailwind CSS 4.2** with shadcn/ui
- **Recharts** for charts and visualizations
- **Leaflet** for maps with custom weather overlays

### Backend
- **Neon PostgreSQL** serverless database
- **Custom JWT Authentication** with bcrypt
- **Email System** with templates and triggers
- **Extensions System** with event hooks
- **Widget Builder** with embeddable views

### Database
- **63 PostgreSQL Tables** covering all operations
- **Complete RBAC** with 4 permission tiers
- **Audit Logging** for all actions
- **Activity Tracking** system-wide

## Feature Matrix

| Feature | Status | Access |
|---------|--------|--------|
| Crew Management | ✅ Complete | All Roles |
| Fleet Operations | ✅ Complete | Admin+ |
| Voyage Planning | ✅ Complete | Admin+ |
| Invoicing System | ✅ Complete | Admin+ |
| Email Automation | ✅ Complete | Admin+ |
| Extensions | ✅ Complete | Admin+ |
| Widget Builder | ✅ Complete | Admin+ |
| Live Vessel Map | ✅ Complete | Admin+ |
| Schema Visualization | ✅ Complete | Sysadmin |
| Data Export | ✅ Complete | Admin+ |
| Query Builder | ✅ Complete | Admin+ |

## Security Highlights

- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Email provider credential encryption
- ✅ Widget access token authentication
- ✅ Audit logging of all actions
- ✅ E-signature audit trail
- ✅ Activity tracking

## Performance

- Optimized database queries with indexes
- SWR caching on client side
- Efficient pagination throughout
- Debounced form submissions
- Lazy loading for large datasets
- Canvas-based rendering for complex visualizations

## Documentation

- [README.md](README.md) - Complete feature documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide with all platforms
- API documentation embedded in code
- Component PropTypes and TypeScript types
- Database schema documentation

## Known Limitations & Future Roadmap

### Current Version
- Single-organization setup
- Manual backup/restore
- Email via SMTP only

### Planned for Future Releases
- Multi-organization support
- Automated daily backups
- Direct payment processor integration (Stripe/PayPal)
- Mobile native app
- Advanced analytics dashboards
- AI-powered crew matching
- Blockchain document verification

## Support & Contributing

- 📖 [Full Documentation](README.md)
- 🐛 [Bug Reports](https://github.com/your-org/searm/issues)
- 💬 [Discussions](https://github.com/your-org/searm/discussions)
- 📧 Contact: support@searm.dev

## License

MIT License - See LICENSE file for details

## Changelog

### v2.0 (Current)
- Added crew invoicing system
- Added database schema visualization
- Expanded database from 33 to 63 tables
- Enhanced admin tools
- Improved documentation

### v1.0
- Initial release with crew management
- Fleet and voyage operations
- Widget builder
- Extensions system
- Email automation
- Live vessel map

---

**Ready to deploy?** Follow the [Quick Start Guide](README.md#quick-start) or check out [Deployment Options](DEPLOYMENT.md).
