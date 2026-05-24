# SeaRM SSO (Single Sign-On) Implementation Guide

## Overview

SeaRM now features a complete, production-ready BYO (Bring Your Own) SSO system supporting OAuth2 and SAML2 authentication. Users can link their existing enterprise identities to their SeaRM accounts and use them to log in.

## Features

### Core Capabilities
- **OAuth2 Support** - Google, GitHub, Microsoft, and any OAuth2-compatible provider
- **SAML2 Support** - Okta, Azure AD, OneLogin, and any SAML2-compatible identity provider
- **Account Linking** - Users can link/unlink their accounts to multiple providers
- **Auto-Linking** - Optional automatic linking by email domain
- **Encrypted Token Storage** - Access and refresh tokens stored encrypted at rest
- **Audit Logging** - Complete SSO event audit trail for security compliance
- **Fully Toggleable** - Enable/disable SSO globally and per-provider
- **Admin Dashboard** - Manage providers, view audit logs, test connections
- **User Dashboard** - Users can see linked accounts and manage connections

## Database Schema

Four new tables added for SSO functionality:

### sso_providers
Stores SSO provider configurations (OAuth2 and SAML2)
- `id` - Provider UUID
- `name`, `type` - Provider name and type
- `client_id`, `client_secret_encrypted` - OAuth credentials
- `auth_endpoint`, `token_endpoint`, `userinfo_endpoint` - OAuth endpoints
- `issuer`, `metadata_url`, `certificate_encrypted` - SAML attributes
- `is_active`, `is_primary` - Status flags
- `auto_link_by_email` - Auto-link toggle

### sso_credentials
Stores encrypted OAuth/SAML credentials per user
- User-provider relationship
- Encrypted access and refresh tokens
- SAML attributes (JSON)
- Last login tracking

### sso_linked_accounts
Tracks user account linking status
- User-provider relationship
- Linking/unlinking timestamps
- Account status (active/unlinked)

### sso_audit_log
Audit trail for all SSO events
- Login attempts (success/failure)
- Link/unlink events
- IP address and user agent
- Event metadata

## Quick Start

### Admin: Configure Google OAuth

1. Go to Google Cloud Console → Create OAuth App
2. Set Authorized Redirect URI: `https://yourdomain.com/api/auth/sso/oauth2/callback`
3. Copy Client ID and Client Secret
4. In SeaRM Admin: Settings → SSO Providers → Add
5. Fill in:
   - Name: `Google`
   - Type: `OAuth2`
   - Display Name: `Sign in with Google`
   - Client ID: (paste from Google)
   - Client Secret: (paste from Google)
   - Auth Endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
   - Token Endpoint: `https://oauth2.googleapis.com/token`
   - Userinfo Endpoint: `https://openidconnect.googleapis.com/v1/userinfo`
   - Scope: `openid profile email`
6. Check Active and click Add

### User: Link Account

1. Login to SeaRM
2. Profile → Security → Linked Accounts
3. Click "Link" next to provider
4. Complete OAuth/SAML flow with provider
5. Account linked - can now use SSO to login

### User: Login with SSO

1. On login page, click SSO provider button
2. Authenticate with provider
3. Automatically logged in
4. First-time users auto-created if enabled

## API Endpoints

**Public (no auth required):**
- `GET /api/auth/sso/providers` - List active providers
- `GET /api/auth/sso/oauth2/callback?provider=id&code=xxx` - OAuth callback
- `POST /api/auth/sso/saml2/acs` - SAML assertion handler

**Protected (login required):**
- `GET /api/auth/sso/link` - Get user's linked accounts
- `POST /api/auth/sso/link` - Link new account
- `DELETE /api/auth/sso/link` - Unlink account

**Admin (sysadmin only):**
- `GET /api/admin/sso/providers` - List all providers
- `POST /api/admin/sso/providers` - Create provider
- `GET /api/admin/sso/audit-logs` - View audit trail

## Components

- `SSOSettings` - User-facing component for linking/unlinking accounts
- `AdminSSOConfig` - Admin panel for managing providers

## Security

- All credentials encrypted at rest with AES-256-CBC
- SSO events logged with IP/user agent for audit
- Users cannot unlink only login method
- Session tokens validated on each request
- SAML signatures verified server-side

## Environment Variables

```env
ENCRYPTION_KEY=your-secret-key-32-chars-minimum
SSO_ENABLED=true
SSO_ONLY=false  # Set true to disable password login
SSO_SESSION_TIMEOUT=86400
```

## Supported Providers

**OAuth2:**
- Google
- GitHub
- Microsoft
- Apple
- Any OIDC provider

**SAML2:**
- Okta
- Azure AD
- OneLogin
- Any SAML2 IdP

## Advanced Features

### Auto-Linking by Email
When enabled on provider, users with matching email automatically linked on first SSO login.

### Multiple Linked Providers
Users can link multiple SSO providers and use any to login.

### Primary Provider
Mark one as primary for default login method on UI.

### Audit Logs
Complete event trail: logins, links, unlinking, errors. Admin can filter by user/provider/event type.
