# SSO Provider Configuration Templates

Use these templates to quickly configure popular SSO providers in SeaRM.

## Google OAuth2

**Provider Configuration:**
```
Name: Google
Type: OAuth2
Display Name: Sign in with Google
Client ID: [from Google Cloud Console]
Client Secret: [from Google Cloud Console]
Redirect URI: https://yourdomain.com/api/auth/sso/oauth2/callback
Auth Endpoint: https://accounts.google.com/o/oauth2/v2/auth
Token Endpoint: https://oauth2.googleapis.com/token
Userinfo Endpoint: https://openidconnect.googleapis.com/v1/userinfo
Scope: openid profile email
Logo URL: https://www.gstatic.com/images/branding/product/1x/googleg_120x120.png
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new OAuth 2.0 application
3. Set Authorized JavaScript origins: `https://yourdomain.com`
4. Set Authorized redirect URIs: `https://yourdomain.com/api/auth/sso/oauth2/callback`
5. Copy Client ID and Secret
6. Fill in SeaRM admin panel

## Microsoft Azure AD OAuth2

**Provider Configuration:**
```
Name: Microsoft
Type: OAuth2
Display Name: Sign in with Microsoft
Client ID: [Application ID from Azure]
Client Secret: [Client secret from Azure]
Redirect URI: https://yourdomain.com/api/auth/sso/oauth2/callback
Auth Endpoint: https://login.microsoftonline.com/common/oauth2/v2.0/authorize
Token Endpoint: https://login.microsoftonline.com/common/oauth2/v2.0/token
Userinfo Endpoint: https://graph.microsoft.com/v1.0/me
Scope: openid profile email
Logo URL: https://learn.microsoft.com/en-us/windows-hardware/images/logos/windows_logo_blue.png
```

**Setup Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Go to Authentication → Add Redirect URI: `https://yourdomain.com/api/auth/sso/oauth2/callback`
4. Create a client secret
5. Go to API Permissions → Grant admin consent
6. Copy Application ID and secret value

## GitHub OAuth2

**Provider Configuration:**
```
Name: GitHub
Type: OAuth2
Display Name: Sign in with GitHub
Client ID: [Client ID from GitHub]
Client Secret: [Client Secret from GitHub]
Redirect URI: https://yourdomain.com/api/auth/sso/oauth2/callback
Auth Endpoint: https://github.com/login/oauth/authorize
Token Endpoint: https://github.com/login/oauth/access_token
Userinfo Endpoint: https://api.github.com/user
Scope: read:user user:email
Logo URL: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png
```

**Setup Steps:**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL: `https://yourdomain.com/api/auth/sso/oauth2/callback`
4. Copy Client ID and generate Client Secret
5. Fill in SeaRM admin panel

## Okta SAML2

**Provider Configuration:**
```
Name: Okta
Type: SAML2
Display Name: Sign in with Okta
Issuer: https://yourorg.okta.com
Metadata URL: https://yourorg.okta.com/app/abc123/sso/saml/metadata
Certificate: [Copy from metadata]
```

**Setup Steps:**
1. In Okta Admin Console, go to Applications
2. Create new SAML 2.0 application
3. Set Single sign on URL: `https://yourdomain.com/api/auth/sso/saml2/acs`
4. Set Audience URI: `https://yourdomain.com`
5. Configure attribute statements: email, name
6. Copy metadata URL and certificate
7. Fill in SeaRM admin panel
8. Assign users to application

## Azure AD SAML2

**Provider Configuration:**
```
Name: Azure AD
Type: SAML2
Display Name: Sign in with Azure AD
Issuer: https://sts.windows.net/[tenant-id]/
Metadata URL: https://login.microsoftonline.com/[tenant-id]/federationmetadata/2007-06/federationmetadata.xml
Certificate: [Copy from metadata]
```

**Setup Steps:**
1. In Azure Portal, go to Enterprise Applications
2. Create new application
3. Set SAML Single Sign-On URL: `https://yourdomain.com/api/auth/sso/saml2/acs`
4. Set Entity ID: `https://yourdomain.com`
5. Download certificate and metadata
6. Configure User Attributes & Claims
7. Fill in SeaRM admin panel

## OneLogin SAML2

**Provider Configuration:**
```
Name: OneLogin
Type: SAML2
Display Name: Sign in with OneLogin
Issuer: https://app.onelogin.com/saml/metadata/[app-id]
Metadata URL: https://app.onelogin.com/saml/metadata/[app-id]
Certificate: [Copy from metadata]
```

**Setup Steps:**
1. In OneLogin Admin Portal, go to Applications
2. Add new SAML application
3. Set ACS URL: `https://yourdomain.com/api/auth/sso/saml2/acs`
4. Set Audience (Entity ID): `https://yourdomain.com`
5. Save application
6. Copy metadata URL and certificate
7. Fill in SeaRM admin panel
8. Assign users

## Generic OAuth2 Provider

**Provider Configuration:**
```
Name: [Provider Name]
Type: OAuth2
Display Name: Sign in with [Provider]
Client ID: [From provider]
Client Secret: [From provider]
Redirect URI: https://yourdomain.com/api/auth/sso/oauth2/callback
Auth Endpoint: [Provider's /authorize endpoint]
Token Endpoint: [Provider's /token endpoint]
Userinfo Endpoint: [Provider's /userinfo endpoint]
Scope: openid profile email
Logo URL: [Optional]
```

**Common OAuth Endpoints:**
- Authorization: `https://provider.com/oauth/authorize`
- Token: `https://provider.com/oauth/token`
- Userinfo: `https://provider.com/oauth/userinfo`

## Testing Configuration

Before deploying to production:

1. **Test Provider Connection**
   - Admin panel: Test Connection button
   - Verify credentials accepted

2. **Test OAuth Flow (if OAuth2)**
   - Create test user
   - Try linking account
   - Verify auth flow completes

3. **Test SAML Flow (if SAML2)**
   - Verify certificate is valid
   - Test assertion validation
   - Check attribute mapping

4. **Test Auto-Linking (if enabled)**
   - Create user with same email as provider
   - Login with SSO
   - Verify account auto-linked

5. **Test Audit Logging**
   - Perform login/link/unlink
   - Check audit logs show events

## Troubleshooting Provider Setup

**Error: Invalid redirect URI**
- Ensure redirect URI matches exactly in both provider and SeaRM
- No trailing slashes or query parameters

**Error: Invalid client credentials**
- Verify Client ID and Secret copied correctly
- Check for extra spaces or special characters
- Regenerate credentials if needed

**Error: Scope not allowed**
- Verify scope is supported by provider
- Check spelling of scope values
- Some providers use different scope names

**Error: Endpoint not found**
- Verify endpoint URLs are correct
- Some providers use different base URLs per region
- Check provider documentation for correct endpoints

**SAML: Signature verification failed**
- Ensure certificate is copied completely
- Check certificate format (PEM required)
- Verify certificate not expired
- Check metadata for updates

## Additional Resources

- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [SAML 2.0 Overview](https://en.wikipedia.org/wiki/SAML_2.0)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Okta SAML Documentation](https://developer.okta.com/docs/guides/saml-application-setup/)
- [Azure AD SAML Documentation](https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/configure-saml-single-sign-on)
