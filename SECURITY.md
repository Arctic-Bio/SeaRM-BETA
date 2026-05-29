# Security Policy

## Reporting a Vulnerability

SeaRM takes security seriously. If you discover a security vulnerability, please report it responsibly by emailing **security@searm.dev** instead of using the issue tracker.

### What to Include

Please provide:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### Timeline

We will:
1. Acknowledge receipt within 48 hours
2. Provide an initial assessment within 1 week
3. Release a fix within 2 weeks (or provide a timeline)
4. Credit you publicly if desired

## Security Features

### Authentication & Authorization

✅ **JWT Token-Based Authentication**
- Tokens signed with bcrypt-hashed secrets
- Session validation on every request
- Automatic logout on inactivity (configurable)

✅ **Role-Based Access Control (RBAC)**
- 4 permission tiers: sysadmin, staff, coordinator, crew
- Granular per-resource permissions
- Database-backed role and permission system

✅ **API Authorization Middleware**
- All sensitive endpoints require `requireApiAuth()`
- Staff-only endpoints protected by role check
- Permission-based access control on specific routes

### Database Security

✅ **Parameterized Queries**
- All database queries use parameterized statements
- No string interpolation of user input
- SQL injection prevention throughout codebase

✅ **Credential Encryption**
- Email provider SMTP credentials encrypted at rest
- Widget access tokens securely hashed
- No secrets logged or exposed in errors

✅ **Data Isolation**
- Per-user data filtering on crew portal
- Row-level security consideration for multi-org setups
- Audit logging of all data access

### Input Validation

✅ **Server-Side Validation**
- Zod schema validation on all API inputs
- Type-safe TypeScript throughout
- Whitelist validation for sensitive fields (e.g., table names in exports)

✅ **Client-Side Protection**
- HTML escaping for all dynamic content
- XSS prevention in JSX rendering
- Content Security Policy headers

### Audit & Monitoring

✅ **Comprehensive Audit Logging**
- All user actions logged to `activity_log` table
- All extension actions logged to `extension_logs`
- E-signature audit trail with timestamps
- Queryable audit history

✅ **Error Handling**
- No sensitive information in error messages
- Errors logged securely on server
- Generic error responses to clients

## Security Best Practices

### For Deployment

1. **Use HTTPS** - Always use TLS/SSL in production
2. **Environment Variables** - Keep secrets in env vars, not in code
3. **Database Backups** - Regular encrypted backups with tested restores
4. **Access Logs** - Monitor and alert on suspicious access patterns
5. **Updates** - Keep dependencies up to date with security patches

### For Administrators

1. **Strong Passwords** - Enforce strong password requirements for users
2. **Permission Review** - Regularly audit user permissions and roles
3. **Credential Rotation** - Rotate SMTP and API credentials periodically
4. **Activity Monitoring** - Review activity logs for suspicious behavior
5. **Incident Response** - Have a plan for security incidents

### For Developers

1. **Code Review** - All changes reviewed before merge
2. **Security Testing** - Test for common vulnerabilities
3. **Dependency Scanning** - Monitor dependencies for known vulnerabilities
4. **Secure Defaults** - Default to secure settings, require opt-in for risky features
5. **Documentation** - Document security implications of changes

## Dependency Security

SeaRM uses `pnpm` for deterministic dependency management. Security is maintained through:

- Regular `pnpm audit` checks
- Automated dependency updates with security patches
- Manual review of major version updates
- Pinned versions of critical dependencies

To check for vulnerabilities:
```bash
pnpm audit
```

## Known Security Considerations

### Single-Organization Deployment

Current version is designed for single-organization use. Multi-organization support requires:
- Additional row-level security policies
- Per-organization encryption keys
- Separate audit trails per organization

### Email Security

- SMTP credentials stored encrypted in database
- Consider using dedicated email service provider
- Enable TLS for SMTP connections
- Implement SPF/DKIM/DMARC records

### File Storage

- Uploaded files scanned for malware recommended
- File size limits enforced
- Access logs maintained
- Consider external storage (Vercel Blob) vs. database

## Security Headers

SeaRM includes recommended security headers:

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Compliance

### Data Privacy

- GDPR ready (needs configured data retention policies)
- CCPA compatible (user data export available)
- SOC 2 alignment recommended for production

### Audit Trail

- Complete activity logging
- Tamper-evident audit trail
- E-signature compliance (ESIGN Act, EU eIDAS)

## Security Updates

Subscribe to security updates:
- GitHub Security Advisories
- Release notes on GitHub
- Email notifications (optional)

Check `/releases` page for security patches.

## Third-Party Security

SeaRM integrates with:

- **Neon PostgreSQL** - Enterprise-grade database security
- **Vercel** - DDoS protection, SSL/TLS, infrastructure security
- **Nodemailer** - SMTP security (TLS/SSL support)

Each third-party service has its own security policies.

## Responsible Disclosure

We ask security researchers to:
1. Report privately to security@searm.dev
2. Avoid public disclosure until patch released
3. Not exploit vulnerabilities for personal gain
4. Allow reasonable time for patch development

We commit to:
1. Responding promptly to reports
2. Releasing patches quickly
3. Crediting researchers appropriately
4. Keeping communication confidential

## Questions?

- 📧 Email: arctic.framework@gmail.com
- 📖 See [README.md](README.md) for general docs
- 🔒 See [DEPLOYMENT.md](DEPLOYMENT.md) for security setup

---

**Thank you for helping keep SeaRM secure.** ⚓
