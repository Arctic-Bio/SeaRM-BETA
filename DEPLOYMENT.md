# Deployment Guide for SeaRM

This guide provides detailed instructions for deploying SeaRM to various platforms.

## Table of Contents

- [Vercel (Recommended)](#vercel-recommended)
- [Self-Hosted: Docker](#self-hosted-docker)
- [Self-Hosted: Linux/Ubuntu](#self-hosted-linuxubuntu)
- [Database Setup](#database-setup)
- [Post-Deployment Checklist](#post-deployment-checklist)

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
