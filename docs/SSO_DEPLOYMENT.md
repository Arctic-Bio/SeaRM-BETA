# SSO System - Installation & Deployment Notes

## Pre-Deployment Checklist

- [ ] Encryption key set (32+ characters)
- [ ] Database tables created (sso_providers, sso_credentials, sso_linked_accounts, sso_audit_log)
- [ ] API endpoints deployed and accessible
- [ ] SSO components (SSOSettings, AdminSSOConfig) imported in relevant pages
- [ ] Environment variables configured
- [ ] At least one OAuth2 or SAML2 provider configured
- [ ] Test user account created for verification
- [ ] Audit logs accessible to admins
- [ ] Security review completed

## Installation Steps

### 1. Database Setup

Ensure these tables exist (created during setup):

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'sso_%';
```

Should return:
- sso_providers
- sso_credentials
- sso_linked_accounts
- sso_audit_log

### 2. Environment Configuration

Add to your `.env.local`:

```env
# Required: Encryption key for storing credentials
# Must be 32+ characters
ENCRYPTION_KEY=your-super-secret-encryption-key-must-be-32-chars-minimum

# Optional: SSO configuration
SSO_ENABLED=true
SSO_ONLY=false
SSO_SESSION_TIMEOUT=86400
```

### 3. Verify Files Are Present

Check these files exist in the codebase:

```
lib/sso.ts                                    ✓ SSO library
lib/sso-handlers.ts                          ✓ OAuth2/SAML2 handlers
components/sso-settings.tsx                  ✓ User UI
components/admin-sso-config.tsx              ✓ Admin UI
app/api/auth/sso/providers/route.ts          ✓ Providers endpoint
app/api/auth/sso/oauth2/callback/route.ts    ✓ OAuth2 callback
app/api/auth/sso/saml2/acs/route.ts          ✓ SAML2 ACS
app/api/auth/sso/link/route.ts               ✓ Link/unlink endpoint
app/api/admin/sso/providers/route.ts         ✓ Admin providers endpoint
app/api/admin/sso/audit-logs/route.ts        ✓ Admin audit logs endpoint
docs/SSO_GUIDE.md                            ✓ Documentation
docs/SSO_PROVIDER_TEMPLATES.md               ✓ Provider configs
```

### 4. Integrate into Your Application

#### Add User Profile Page Integration

In your user profile/settings page, add:

```tsx
import { SSOSettings } from '@/components/sso-settings'

export default function SettingsPage() {
  return (
    <div>
      {/* ... other settings ... */}
      <SSOSettings />
    </div>
  )
}
```

#### Add Admin Settings Integration

In your admin settings page, add:

```tsx
import { AdminSSOConfig } from '@/components/admin-sso-config'

export default function AdminSettingsPage() {
  return (
    <div>
      {/* ... other admin settings ... */}
      <AdminSSOConfig />
    </div>
  )
}
```

#### Add to Login Page

Add SSO provider buttons to your login page:

```tsx
import { getActiveProviders } from '@/lib/sso'

export default async function LoginPage() {
  const providers = await getActiveProviders()

  return (
    <div>
      {/* Standard email/password login */}
      <LoginForm />

      {providers.length > 0 && (
        <div>
          <h3>Or sign in with</h3>
          {providers.map(provider => (
            <a
              key={provider.id}
              href={`/api/auth/sso/${provider.type === 'oauth2' ? 'oauth2/callback' : 'saml2/acs'}?provider=${provider.id}`}
            >
              {provider.provider_display_name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 5. Configure Your First Provider

1. Start application locally or deploy
2. Navigate to Admin → Settings → SSO Providers
3. Click "Add SSO Provider"
4. Choose OAuth2 or SAML2
5. Fill in credentials from your IdP (Google, Okta, etc.)
6. Reference `docs/SSO_PROVIDER_TEMPLATES.md` for exact configuration
7. Click "Add Provider"

### 6. Test the Flow

**Test OAuth2:**
1. Create test user account
2. Go to Profile → Security → Linked Accounts
3. Click "Link" next to provider
4. Complete OAuth authentication
5. Verify success message and account linked

**Test SAML2:**
1. Create test user account
2. Go to Profile → Security → Linked Accounts
3. Click "Link" next to provider
4. Complete SAML authentication
5. Verify success message and account linked

**Test Login:**
1. Logout from SeaRM
2. On login page, click SSO provider button
3. Complete authentication with provider
4. Verify auto-logged in to SeaRM

**Test Audit Logs:**
1. Go to Admin → SSO Audit Logs
2. Filter by recent events
3. Verify login, link, and other events are logged

### 7. Security Review

Before going live:

- [ ] Verify encryption key is strong and secret
- [ ] Audit logs are accessible only to admins
- [ ] Token refresh is working (for OAuth2)
- [ ] SAML certificates are valid and not expired
- [ ] Provider credentials are kept secret (never logged)
- [ ] Session tokens are validated on each request
- [ ] Users cannot unlink their only authentication method
- [ ] Rate limiting is in place on auth endpoints

## Deployment Considerations

### SSL/TLS Certificate

- Required for production OAuth2/SAML2
- All endpoints must be HTTPS
- Redirect URIs must use https://

### Redirect URIs

Update redirect URIs for each environment:

**Local Development:**
```
http://localhost:3000/api/auth/sso/oauth2/callback
http://localhost:3000/api/auth/sso/saml2/acs
```

**Staging:**
```
https://staging.yourdomain.com/api/auth/sso/oauth2/callback
https://staging.yourdomain.com/api/auth/sso/saml2/acs
```

**Production:**
```
https://yourdomain.com/api/auth/sso/oauth2/callback
https://yourdomain.com/api/auth/sso/saml2/acs
```

### Session Management

For multi-instance deployments:

- Store sessions in Redis or database
- Set SESSION_SECRET environment variable
- Use SameSite=Lax for cookies
- Set Secure flag for HTTPS

### Database Backups

Include SSO tables in backups:
- sso_providers
- sso_credentials
- sso_linked_accounts
- sso_audit_log

Note: sso_credentials contains encrypted tokens - encryption key must be backed up separately.

## Monitoring & Maintenance

### Monitor These Metrics

```sql
-- SSO logins per provider
SELECT provider_id, COUNT(*) as login_count
FROM sso_audit_log
WHERE event_type = 'login' AND status = 'success'
GROUP BY provider_id;

-- Failed login attempts
SELECT COUNT(*), error_message
FROM sso_audit_log
WHERE event_type = 'login' AND status = 'failure'
GROUP BY error_message;

-- Users with multiple providers linked
SELECT user_id, COUNT(*) as provider_count
FROM sso_linked_accounts
WHERE status = 'active'
GROUP BY user_id HAVING COUNT(*) > 1;
```

### Regular Maintenance

- Check SAML certificates not expired (alert 30 days before)
- Review audit logs for suspicious activity
- Verify OAuth refresh tokens working
- Monitor error rates in audit logs
- Clean up old audit logs per retention policy

### Troubleshooting Checklist

| Issue | Check |
|-------|-------|
| OAuth callback fails | Redirect URI matches in provider config and SeaRM |
| Token storage fails | ENCRYPTION_KEY is set and 32+ chars |
| User cannot link | Provider is marked as "Active" |
| SAML validation fails | Certificate is valid and not expired |
| Auto-link not working | Provider has "auto_link_by_email" enabled |
| Session expires quickly | SSO_SESSION_TIMEOUT is reasonable (default 86400s) |

## Rolling Back SSO

If issues arise:

1. Disable provider: Admin → SSO Providers → Uncheck "Active"
2. Users can still use password login
3. Linked accounts remain in database
4. Re-enable when issue resolved

To completely remove SSO:

1. Delete all providers via admin panel
2. Set `SSO_ENABLED=false` in environment
3. Remove SSO components from UI
4. SSO tables can remain for audit purposes

## Performance Optimization

### Add Database Indexes

Already created during setup:
- `idx_sso_credentials_user`
- `idx_sso_credentials_provider`
- `idx_sso_linked_accounts_user`
- `idx_sso_providers_active`
- `idx_sso_audit_log_user`
- `idx_sso_audit_log_provider`
- `idx_sso_audit_log_event`

### Cache Providers List

Consider caching active providers in application memory:

```tsx
// Cache doesn't change frequently
const providers = await getActiveProviders()
// Cache for 5 minutes
```

### Audit Log Cleanup

Archive old logs regularly:

```sql
-- Archive logs older than 1 year
DELETE FROM sso_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year'
```

## Support Resources

- See `docs/SSO_GUIDE.md` for user documentation
- See `docs/SSO_PROVIDER_TEMPLATES.md` for provider setup guides
- Check `SSO_IMPLEMENTATION.md` for technical details
- Review `lib/sso.ts` for API documentation in code comments
