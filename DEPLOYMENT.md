# Deployment Guide for SeaRM

SeaRM is a production-ready maritime crew management and operations platform built with Next.js 16, React 19, TypeScript, Tailwind CSS, and PostgreSQL. This guide provides detailed instructions for deploying SeaRM to various platforms.

## Features Overview

**Core Capabilities:**
- 63-table PostgreSQL database with full maritime operations schema
- Crew management with 15-skill rating system and applications pipeline
- Fleet and voyage management with live vessel tracking and weather overlays
- Document management with e-signatures and compliance tracking
- Crew invoicing with automatic generation, hour tracking, and payment management
- Email automation with templates and trigger-based sending
- Widget builder for embeddable data views
- Extensions system with event hooks and cron jobs
- Advanced query builder and data export (18+ sources)
- Interactive database schema visualization
- Role-based access control with 4 permission tiers

## Table of Contents

- [Vercel (Recommended)](#vercel-recommended)
- [Self-Hosted: Docker](#self-hosted-docker)
- [Self-Hosted: Linux/Ubuntu](#self-hosted-linuxubuntu)
- [Database Setup](#database-setup)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Feature Activation](#feature-activation)

## Vercel (Recommended)

Vercel is the easiest and most cost-effective way to deploy SeaRM. It's optimized for Next.js and includes automatic CI/CD.

### Prerequisites

- GitHub account with your SeaRM repository
- Vercel account (free tier available)
- Neon PostgreSQL database

### Step-by-Step Deployment

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial SeaRM deployment"
   git push origin main
   ```

2. **Visit Vercel Dashboard**
   - Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"

3. **Import GitHub Repository**
   - Select your GitHub account
   - Find and select the `searm` repository
   - Click "Import"

4. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `.` (current directory)
   - **Build Command**: `pnpm build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `pnpm install` (auto-detected)

5. **Add Environment Variables**
   - In the "Environment Variables" section, add:
     ```
     Name: DATABASE_URL
     Value: postgresql://user:password@host/database?sslmode=require
     
     Name: AUTH_SECRET
     Value: [generate random string: openssl rand -base64 32]
     
     Name: NEXT_PUBLIC_APP_URL
     Value: https://searm.vercel.app
     ```
   - Click "Deploy"

6. **Monitor Deployment**
   - Vercel will build and deploy automatically
   - Watch the build logs in real-time
   - Once complete, your app is live at `https://your-project.vercel.app`

### Enable Automatic Deployments

Every push to the `main` branch will automatically deploy:
- Main branch → Production
- Other branches → Preview deployments

### Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS instructions
4. Wait for DNS propagation (5-30 minutes)

## Self-Hosted: Docker

Docker containerizes your application for easy deployment anywhere.

### Prerequisites

- Docker installed ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose (optional, for running with database)
- Server with Docker support (any cloud provider or on-premises)

### Building the Docker Image

1. **Create Dockerfile** (if not included)
   ```dockerfile
   # Use official Node.js runtime as base image
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Install pnpm
   RUN npm install -g pnpm
   
   # Copy package files
   COPY package.json pnpm-lock.yaml ./
   
   # Install dependencies
   RUN pnpm install --frozen-lockfile
   
   # Copy application code
   COPY . .
   
   # Build the Next.js app
   RUN pnpm build
   
   # Expose port 3000
   EXPOSE 3000
   
   # Start the application
   CMD ["pnpm", "start"]
   ```

2. **Build the image**
   ```bash
   docker build -t searm:latest .
   ```

3. **Verify the build**
   ```bash
   docker images searm
   ```

### Running the Docker Container

1. **Local testing**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="postgresql://..." \
     -e AUTH_SECRET="your-secret-key" \
     -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
     searm:latest
   ```

2. **Production deployment**
   ```bash
   docker run -d \
     --name searm \
     --restart always \
     -p 3000:3000 \
     -e DATABASE_URL="postgresql://..." \
     -e AUTH_SECRET="your-secret-key" \
     -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
     searm:latest
   ```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  searm:
    build: .
    container_name: searm
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/searm
      AUTH_SECRET: your-secret-key-here
      NEXT_PUBLIC_APP_URL: http://localhost:3000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    container_name: searm-db
    environment:
      POSTGRES_USER: searm
      POSTGRES_PASSWORD: your-password-here
      POSTGRES_DB: searm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

### Pushing to Docker Registry

1. **Tag the image**
   ```bash
   docker tag searm:latest your-registry/searm:latest
   ```

2. **Push to Docker Hub or other registry**
   ```bash
   docker push your-registry/searm:latest
   ```

## Self-Hosted: Linux/Ubuntu

### Prerequisites

- Ubuntu 20.04 LTS or later
- Node.js 18+ installed
- PostgreSQL 14+ installed
- pnpm installed globally
- Nginx or Apache (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

### Installation Steps

1. **Clone the repository**
   ```bash
   cd /var/www
   git clone https://github.com/your-org/searm.git
   cd searm
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   nano .env.local
   # Edit with your database URL and secrets
   ```

4. **Build the application**
   ```bash
   pnpm build
   ```

5. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

6. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### PM2 Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'searm',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
```

### Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/searm`:

```nginx
upstream searm {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy settings
    location / {
        proxy_pass http://searm;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/searm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Set up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

### Auto-renewal

```bash
sudo certbot renew --dry-run
```

## Database Setup

### Option 1: Neon (Recommended for Cloud)

1. Visit [https://neon.tech](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string
4. Add to environment variables: `DATABASE_URL`
5. Run `pnpm run db:init` to initialize schema

### Option 2: PostgreSQL Managed Service

**AWS RDS:**
1. Create RDS PostgreSQL instance
2. Configure security groups for your app server
3. Initialize database: `createdb searm`
4. Run migrations

**DigitalOcean Database:**
1. Create managed PostgreSQL database
2. Get connection string from dashboard
3. Allow your app's IP in firewall rules
4. Run initialization script

### Option 3: Self-Hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE searm;
CREATE USER searm_user WITH PASSWORD 'secure-password-here';
ALTER ROLE searm_user SET client_encoding TO 'utf8';
ALTER ROLE searm_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE searm_user SET default_transaction_deferrable TO on;
ALTER ROLE searm_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE searm TO searm_user;
\q

# Initialize schema
DATABASE_URL="postgresql://searm_user:password@localhost:5432/searm" pnpm run db:init
```

## Post-Deployment Checklist

- [ ] Database connection verified
- [ ] First admin user created
- [ ] HTTPS/SSL enabled (if using custom domain)
- [ ] Environment variables set correctly
- [ ] Automatic backups configured
- [ ] Monitoring and alerting set up
- [ ] Error tracking (Sentry) configured
- [ ] Domain name configured (if using custom domain)
- [ ] Email service configured (optional but recommended)
- [ ] Performance tested with production-like data
- [ ] Security headers verified
- [ ] Database indexes optimized
- [ ] Rate limiting configured (if needed)

## Common Deployment Issues

### "DATABASE_URL not set"
- Verify environment variables are set on your hosting platform
- For Docker: use `-e` flags or `.env` file
- For PM2: set in `ecosystem.config.js`
- For Vercel: check Environment Variables section in project settings

### "Port already in use"
- Check what's using the port: `lsof -i :3000`
- Kill the process: `kill -9 <PID>`
- Or use a different port: `PORT=3001 pnpm start`

### "Out of memory"
- Increase available memory on your server
- For Docker: set memory limits: `docker run -m 2g ...`
- Optimize Next.js build: `pnpm build --profile`

### "SSL certificate errors"
- Verify certificate paths are correct
- Check certificate expiration: `openssl x509 -in cert.pem -noout -dates`
- Renew with: `certbot renew`

### "Slow initial page loads"
- Enable Next.js caching headers
- Compress responses with gzip
- Optimize database queries
- Consider using CDN (Cloudflare, etc)

## Monitoring in Production

### Essential Metrics to Track

- **Application**: CPU, memory, response time
- **Database**: Query time, connection count, disk usage
- **Infrastructure**: Uptime, error rate, request count

### Recommended Tools

- **Error Tracking**: Sentry, Rollbar
- **Performance**: Datadog, New Relic, LogRocket
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Log Aggregation**: LogRocket, Loggly, CloudWatch

## Scaling for Growth

As your user base grows:

1. **Database**: Upgrade tier or add read replicas
2. **Application**: Use load balancer with multiple instances
3. **Caching**: Add Redis for session/data caching
4. **CDN**: Use Cloudflare or similar for static assets
5. **Search**: Implement Elasticsearch for advanced search

## Support

For deployment help:
- Check the main [README.md](README.md)
- Review [GitHub Issues](https://github.com/your-org/searm/issues)
- Join [GitHub Discussions](https://github.com/your-org/searm/discussions)

## Feature Activation Guide

### Crew Invoicing System

After deployment, enable crew invoicing:

1. **Navigate to Admin Settings** → **Crew Settings** → **Invoice Settings**
2. **Configure Invoice Numbering:**
   - Set invoice prefix (e.g., "INV-2024-")
   - Configure payment terms (due date offset in days)
3. **Company Information:**
   - Add company name, address, tax ID
   - Upload logo for invoice templates
   - Set footer text and payment instructions
4. **Email Automation (Optional):**
   - Enable "Email on Generate" to send invoices automatically
   - Enable "Email on Payment" for payment receipts
   - Configure email templates under Email Settings

### Email System Setup

1. **Navigate to Admin** → **Email** → **Providers**
2. **Add Email Provider:**
   - Choose SMTP provider (Gmail, SendGrid, etc.)
   - Configure credentials (encrypted automatically)
   - Test connection
3. **Create Email Templates:**
   - Go to **Email** → **Templates**
   - Create templates for key events (invoices, applications, assignments)
   - Use variables: `{crew_name}`, `{invoice_number}`, `{amount}`, etc.
4. **Set Up Triggers:**
   - Go to **Email** → **Triggers**
   - Configure automated email sending on events

### Extensions System Setup

1. **Navigate to Admin** → **Extensions**
2. **Browse Available Extensions:**
   - Slack Notifier - Send alerts to Slack
   - Document Expiry Monitor - Track expiring documents
   - Weather Briefing - Daily weather briefings
   - Onboarding Automator - Automated onboarding flows
   - Maintenance Scheduler - Schedule maintenance tasks
3. **Install Extension:**
   - Click install and configure settings
   - Grant necessary permissions
   - Test with sample events
4. **Monitor Activity:**
   - View extension logs under each extension
   - Check for errors or failures

### Widget Builder Setup

1. **Navigate to Integrations** → **Widgets**
2. **Create New Widget:**
   - Choose data source (crew list, voyages, assignments, etc.)
   - Select view type (Table, Cards, List, Stats, Timeline, Minimal)
   - Choose style preset (Modern, Ocean, Minimal, Vibrant, Corporate, Seafoam)
   - Configure columns and filters
3. **Generate Embed Code:**
   - Click "Get Embed Code"
   - Copy iframe or script tag
   - Paste into external website
4. **Manage Access:**
   - Set per-widget access tokens
   - Configure domain whitelist
   - Monitor widget access logs

### Live Vessel Map Configuration

1. **Navigate to Map** (from sidebar)
2. **Add Data Sources:**
   - Click "Sources" panel
   - Add AISHub, MarineTraffic, VesselFinder, or custom REST API
   - Configure API keys for external providers
3. **Configure Weather Overlays:**
   - Click "Weather" panel
   - Toggle layer providers (RainViewer, OpenWeatherMap, NOAA NEXRAD)
   - Adjust opacity and refresh rates
4. **Save Configuration:**
   - Settings persist automatically
   - Reload page to verify persistence

### Database Schema Visualization

1. **Navigate to How To** → **Data Flow Graph** (admin-only)
2. **Interact with Graph:**
   - Scroll to zoom in/out
   - Click and drag nodes to reposition
   - Click entity cards to expand and see all columns
   - Hover relationships to highlight connections
3. **Export Diagram:**
   - Right-click canvas to save as image
   - Use for documentation and team onboarding

### Post-Setup Testing

1. **Create test crew member**
2. **Upload test CSV** (positions/hours)
3. **Generate test invoice**
4. **Send test email**
5. **Verify webhook events** fire correctly
6. **Check activity logs** for all operations

## Performance Tuning

### Database Optimization

```sql
-- Create recommended indexes
CREATE INDEX idx_crew_assignments_crew_id ON crew_assignments(crew_id);
CREATE INDEX idx_crew_assignments_voyage_id ON crew_assignments(voyage_id);
CREATE INDEX idx_crew_invoices_crew_id ON crew_invoices(crew_id);
CREATE INDEX idx_crew_invoices_status ON crew_invoices(status);
CREATE INDEX idx_crew_hourly_logs_crew_id ON crew_hourly_logs(crew_id);
CREATE INDEX idx_crew_hourly_logs_date ON crew_hourly_logs(date);
CREATE INDEX idx_documents_crew_id ON documents(crew_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
```

### Caching Strategy

- Enable browser caching for static assets (24 hours)
- Cache API responses with SWR (client-side caching)
- Use Redis for session storage (if configured)
- Cache widget data for 5-15 minutes depending on update frequency

### Rate Limiting

Consider implementing rate limits for:
- Widget embed endpoints (100 req/min per token)
- API endpoints (1000 req/min per user)
- Email sending (50 emails/hour)
- File uploads (10 MB/file, 100 MB/hour)
