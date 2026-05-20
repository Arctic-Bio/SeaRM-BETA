# SeaRM - Crew Management & Operations Platform

A comprehensive, enterprise-ready crew management and maritime operations platform for volunteer organizations. SeaRM enables seamless crew applications, deployments, e-signatures, vessel management, and operational task tracking.

![SeaRM](https://img.shields.io/badge/SeaRM-Crew%20Management-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Crew Management
- Comprehensive crew application pipeline with customizable stages
- Crew profile management with skills, certifications, and experience tracking
- Document management with upload, verification, and expiration tracking
- E-signature support for contracts, waivers, and legal documents
- Role-based access control (Sysadmin, Admin, Coordinator, Crew)

### Operations
- Vessel & campaign management
- Deployment scheduling and tracking
- Task and incident management
- Document and requirement checklists
- Real-time status updates and notifications

### Admin Tools
- Advanced query builder for data exploration
- Custom tool creation with logical operators and comparisons
- Document verification queue with bulk operations
- User and role management
- Comprehensive audit logging

### Crew Portal
- Self-service crew portal for document uploads
- E-signature signing interface
- Onboarding timeline tracking
- Requirement and checklist management
- Responsive mobile-friendly interface

## Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`) or **npm** 9+
- **PostgreSQL** 14+ (local or hosted via [Neon](https://neon.tech))
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/searm.git
   cd searm
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or with npm
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # Database (Neon PostgreSQL)
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   
   # Auth (change this to a random string in production)
   AUTH_SECRET="searm-secret-key-change-in-production"
   
   # App URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize the database**
   ```bash
   # Create tables and seed initial data
   pnpm run db:init
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```
   
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

6. **Create your first admin account**
   - The login page will detect if it's the first user setup
   - Create your system administrator account with email and password
   - Once created, you can add additional users from the Users page

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/your-org/searm.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Visit [https://vercel.com](https://vercel.com) and sign up/login
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add the following:
     ```
     DATABASE_URL: <your-neon-postgresql-url>
     AUTH_SECRET: <generate-a-random-string>
     NEXT_PUBLIC_APP_URL: <your-vercel-production-url>
     ```

4. **Deploy**
   - Vercel will automatically deploy when you push to main
   - Your app will be available at `https://your-project.vercel.app`

### Deploy to Self-Hosted Server

#### Using Docker

1. **Create Dockerfile** (if not included)
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run**
   ```bash
   docker build -t searm .
   docker run -p 3000:3000 \
     -e DATABASE_URL="postgresql://..." \
     -e AUTH_SECRET="your-secret-key" \
     searm
   ```

#### Using PM2 (Node.js process manager)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Build the application**
   ```bash
   pnpm build
   ```

3. **Start with PM2**
   ```bash
   pm2 start npm --name "searm" -- start
   pm2 save
   ```

4. **Set up auto-restart on reboot**
   ```bash
   pm2 startup
   ```

### Database Setup (Neon PostgreSQL)

1. **Create a Neon account** at [https://neon.tech](https://neon.tech)

2. **Create a new project**
   - Click "New Project"
   - Choose a name and region
   - Select PostgreSQL version 14 or higher

3. **Get your connection string**
   - Copy the full connection string (with password)
   - Add it to your `.env.local` as `DATABASE_URL`

4. **Initialize the schema**
   ```bash
   pnpm run db:init
   ```

## Configuration

### Site Settings

Access site-wide configurations from the **Settings** page:

- **Required Documents**: Define document types all crew must upload
- **Required E-Signature Documents**: Specify documents requiring electronic signatures
- **Feature Flags**: Enable/disable pages and features
- **Email Templates**: Customize notification emails (if email service connected)

### User Roles

| Role | Permissions |
|------|-------------|
| **Sysadmin** | Full system access, user management, settings |
| **Admin** | Crew management, deployments, document verification |
| **Coordinator** | View crew data, manage deployments |
| **Crew** | Access crew portal, upload documents, view onboarding status |

### Customization

#### Application Fields

Edit the `APPLICATION_FIELDS` in `/lib/db.ts` to customize crew application form fields.

#### Pipeline Stages

Modify `PIPELINE_STAGES` in `/lib/db.ts` to add custom application review stages.

#### Onboarding Checklists

Create custom checklist templates in the **Checklists** API (`/api/checklists`).

## Usage

### For Administrators

1. **Manage Crew**
   - Navigate to **Crew** to view all crew members
   - Click on a crew member to view details, upload documents, verify documents
   - Assign checklists and requirements from the crew detail page

2. **Verify Documents**
   - Go to **Settings** → **Document Queue**
   - Review pending document uploads
   - Approve or reject with feedback
   - Batch operations available for bulk processing

3. **Create Custom Tools**
   - Go to **Custom Tools**
   - Build queries using the visual query builder
   - Combine tables with filters (AND/OR logic)
   - Save tools for recurring analysis
   - Export results to CSV

4. **Manage Deployments**
   - Navigate to **Fleet** → **Deployments**
   - Create new deployments with date, vessel, and crew assignments
   - Track deployment status and crew participation

### For Crew Members

1. **Access Crew Portal**
   - Login with crew credentials
   - View onboarding timeline and requirements
   - Upload required documents
   - Sign e-signature documents by typing legal name

2. **Track Progress**
   - Monitor requirements completion
   - View e-signature status
   - Check document verification status
   - Access saved documents

## Troubleshooting

### Common Issues

#### "Cannot connect to database"
- **Check connection string**: Ensure `DATABASE_URL` is correct with proper credentials
- **Verify network access**: For Neon, ensure your IP is whitelisted
- **Test connection**: Run `psql $DATABASE_URL` to test
- **SSL mode**: Some databases require `?sslmode=require` at end of URL

#### "Login redirects to login page infinitely"
- **Clear cookies**: Delete all site cookies and login again
- **Check AUTH_SECRET**: Ensure it's set in `.env.local`
- **Verify database**: Run `SELECT * FROM users;` to confirm users table exists
- **Browser console**: Check for JavaScript errors (F12 → Console)

#### "Schema API returns 500 error"
- **Run migrations**: Execute `pnpm run db:init` to ensure tables exist
- **Check permissions**: Ensure database user has SELECT on all tables
- **Restart dev server**: Kill and restart `pnpm dev`

#### "Documents not uploading"
- **Check storage**: Ensure Vercel Blob or configured storage has available space
- **File size**: Verify file is under 50MB limit
- **CORS issues**: Check browser console for CORS errors
- **Permissions**: Ensure logged-in user has crew role for portal uploads

#### "Custom tools not showing tables"
- **Wait for schema**: First load can take 5-10 seconds
- **Database populated**: Ensure database has crew, applications, and other tables
- **Refresh page**: Try clearing cache and refreshing browser
- **Check API**: Test `/api/tools/schema` in browser to see raw response

#### "Pagination or filtering not working"
- **Check database encoding**: Ensure UTF-8 encoding
- **Verify data types**: Check column types match expected types in `/lib/db.ts`
- **Test query**: Run query directly in database console
- **Browser console**: Look for JavaScript errors in developer tools

#### "Performance is slow"
- **Check database indexes**: Run `ANALYZE;` on production database
- **Monitor query time**: Enable slow query logging on PostgreSQL
- **Optimize queries**: Use Custom Tools to test query performance
- **Scale database**: Consider upgrading Neon tier for better performance

### Database Reset

To completely reset your database (use with caution):

```bash
# Drop all tables (WARNING: destroys all data)
pnpm run db:reset

# Reinitialize schema
pnpm run db:init
```

### Enable Debug Logging

Set debug environment variable to see detailed logs:

```bash
DEBUG=searm:* pnpm dev
```

### Check System Status

1. **Database connection**: Navigate to any page with data (Crew, Fleet, etc.)
2. **Authentication**: Try creating a new user from Users page
3. **File storage**: Upload a document to test storage integration
4. **API endpoints**: Test `/api/health` endpoint (if available)

## Development

### Project Structure

```
searm/
├── app/                    # Next.js 16 App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard
│   ├── crew/              # Crew management pages
│   ├── fleet/             # Vessel & deployment pages
│   ├── portal/            # Crew portal
│   ├── settings/          # Admin settings
│   ├── tools/             # Custom tools
│   ├── how-to/            # Documentation
│   └── ...                # Other feature pages
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── app-sidebar.tsx    # Navigation sidebar
│   ├── auth-provider.tsx  # Auth context
│   └── ...                # Custom components
├── lib/
│   ├── db.ts              # Database schema and types
│   ├── auth.ts            # Authentication utilities
│   └── utils.ts           # Shared utilities
├── public/                # Static assets
├── styles/                # Global CSS
└── package.json           # Dependencies
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- crew.test.ts

# Watch mode
pnpm test -- --watch
```

### Building for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start

# Create a production-ready Docker image
docker build -t searm:latest .
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request** with a clear description

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Run `pnpm lint` before committing
- Format code with Prettier: `pnpm format`

### Reporting Issues

- Check existing issues first
- Provide reproduction steps
- Include environment details (Node version, database, etc.)
- Attach relevant error messages and logs

## Security

### Important Security Notes

1. **Change AUTH_SECRET**: Always use a unique, random string in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Database**: Use strong passwords and restrict database access
4. **Environment variables**: Never commit `.env.local` to git
5. **Dependencies**: Regularly update dependencies with `pnpm update`

### Reporting Security Issues

Please report security vulnerabilities to `security@example.com` (replace with your email) rather than using the public issue tracker.

## Performance Optimization

### Recommended Settings for Production

- **Database**: Use connection pooling (PgBouncer or Neon's built-in)
- **Caching**: Enable Redis for session storage if available
- **CDN**: Use Vercel's edge network or Cloudflare
- **Image optimization**: Leverage Next.js Image component
- **Query optimization**: Use Custom Tools to analyze slow queries

### Monitoring

- Set up error tracking with Sentry or similar
- Monitor database performance metrics
- Track API response times
- Use Vercel's analytics dashboard

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation**: Visit [SeaRM Wiki](https://github.com/your-org/searm/wiki)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/searm/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/your-org/searm/discussions)
- **Email**: support@example.com (replace with your support email)

## Roadmap

- [ ] Mobile native app (React Native)
- [ ] Advanced reporting dashboard
- [ ] Integration with external HR systems
- [ ] Email notification system
- [ ] SMS notifications
- [ ] Real-time collaboration features
- [ ] Video interview storage
- [ ] Multi-language support

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.

## Acknowledgments

Built with:
- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Neon PostgreSQL](https://neon.tech/)

---

**Made with ❤️ for maritime volunteer organizations**
