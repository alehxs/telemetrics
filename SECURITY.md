# Security Documentation

## Overview

This document outlines the security measures implemented in the Telemetrics application and provides guidelines for maintaining security.

---

## Vulnerabilities Fixed

### 1. **Exposed Secrets in Version Control**

**Issue**: Environment files (.env) containing API keys and secrets were committed to version control.

**Fix**:
- Created `.gitignore` at root level to exclude all `.env` files
- Created `.env.example` templates for both frontend and backend
- **ACTION REQUIRED**: Remove the current `.env` files from git history:
  ```bash
  # Remove .env files from git history
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch frontend/.env backend/.env" \
    --prune-empty --tag-name-filter cat -- --all

  # Force push (coordinate with team first!)
  git push origin --force --all
  ```

**Recommendation**: Rotate all exposed credentials immediately:
- Generate new Supabase service keys
- Update Django secret key
- Update all environment variables in production

---

### 2. **Vulnerable NPM Dependencies**

**Issue**: Multiple high-severity vulnerabilities in npm packages including:
- axios (SSRF and DoS vulnerabilities)
- react-router (XSS and CSRF issues)
- form-data (unsafe random function)
- glob (command injection)

**Fix**:
- Ran `npm audit fix` to update all vulnerable packages
- All critical and high-severity vulnerabilities resolved
- 0 vulnerabilities remaining

**Recommendation**:
- Run `npm audit` regularly (weekly)
- Enable Dependabot alerts on GitHub
- Consider using `npm audit fix --force` for breaking changes (test thoroughly)

---

### 3. **Missing Input Validation**

**Issue**: User inputs were not validated or sanitized, creating potential for:
- SQL Injection
- XSS attacks
- NoSQL injection
- Path traversal

**Fix**:
- Created comprehensive validation utilities (`/frontend/src/utils/sanitize.ts`)
- Implemented input validation for all user-supplied data:
  - Year validation (2018-2030)
  - Grand Prix name sanitization
  - Session type whitelisting
  - Data type whitelisting
- Added URL validation to prevent SSRF attacks
- Sanitize all string inputs to prevent XSS

**Usage Example**:
```typescript
import { validateYear, validateGrandPrix, validateSession } from '@/utils/sanitize';

const year = validateYear(userInput); // Throws if invalid
const grandPrix = validateGrandPrix(userInput);
const session = validateSession(userInput);
```

---

### 4. **Missing Rate Limiting**

**Issue**: No rate limiting on API requests could lead to:
- DoS attacks
- Resource exhaustion
- Excessive API costs

**Fix**:
- Implemented client-side rate limiter (60 requests/minute)
- Rate limiter automatically tracks and enforces limits
- Provides user feedback when limit exceeded

**Recommendation**: Implement server-side rate limiting:
```typescript
// For Supabase: Configure rate limits in Supabase dashboard
// Or use a service like Cloudflare or AWS WAF
```

---

### 5. **Missing Security Headers**

**Issue**: No security headers were set, exposing the application to:
- Clickjacking attacks
- XSS attacks
- MIME sniffing vulnerabilities
- Information disclosure

**Fix**: Added comprehensive security headers:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filtering
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Restricts browser features

**Location**: Headers set in:
- `/frontend/index.html` (meta tags)
- `/frontend/vite.config.ts` (dev server and build)

---

### 6. **Insecure Debug Mode**

**Issue**: `DJANGO_DEBUG=True` in backend `.env` file exposes:
- Stack traces with sensitive information
- Internal paths and structure
- Database queries
- Environment variables

**Fix**:
- Created `.env.example` with `DJANGO_DEBUG=False` as default
- Added documentation about debug mode risks

**Recommendation**:
- **NEVER** enable debug mode in production
- Use proper logging instead
- Set `DJANGO_DEBUG=False` in production environment

---

### 7. **Weak Secret Key**

**Issue**: Django secret key was exposed in version control.

**Fix**:
- Removed from version control
- Added to `.env.example` with placeholder

**Recommendation**: Generate a new secure secret key:
```python
# Generate new Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

### 8. **Missing Environment Variable Validation**

**Issue**: No validation of environment variables at startup.

**Fix**:
- Added validation in `/backend/scripts/config.py`
- Validates:
  - Required variables exist
  - URL uses HTTPS protocol
  - Key format is valid
  - Domain matches expected pattern

---

## Security Best Practices Implemented

### Frontend Security

1. **Content Security Policy (CSP)**
   - Security headers prevent XSS and injection attacks
   - Strict HTTPS enforcement
   - Frame denial prevents clickjacking

2. **Input Sanitization**
   - All user inputs are validated and sanitized
   - HTML tags are stripped
   - Special characters are encoded
   - Whitelist validation for known values

3. **Secure API Communication**
   - HTTPS-only connections
   - URL validation prevents SSRF
   - Supabase anon key used (not service role)
   - Session persistence disabled

4. **Build Security**
   - Console logs removed in production
   - Source maps disabled
   - Minification enabled
   - Terser compression

### Backend Security

1. **Environment Variables**
   - All secrets in environment variables
   - Validation at startup
   - No hardcoded credentials

2. **API Keys**
   - Service role key for backend only
   - Never exposed to frontend
   - Validated format and protocol

3. **Database Access**
   - Read-only operations from frontend
   - Row Level Security (RLS) in Supabase
   - Parameterized queries prevent SQL injection

---

## Security Checklist for Deployment

### Pre-Deployment

- [ ] Rotate all exposed secrets (Supabase keys, Django secret)
- [ ] Remove `.env` files from git history
- [ ] Set `DJANGO_DEBUG=False` in production
- [ ] Generate new Django secret key
- [ ] Update `ALLOWED_HOSTS` with production domain
- [ ] Review and tighten Supabase Row Level Security (RLS) policies

### Deployment

- [ ] Use environment variables (not `.env` files) in production
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure Content Security Policy headers
- [ ] Set up server-side rate limiting
- [ ] Enable logging and monitoring
- [ ] Configure CORS properly for production domain

### Post-Deployment

- [ ] Run security audit: `npm audit`
- [ ] Test all security headers: https://securityheaders.com
- [ ] Verify SSL/TLS configuration: https://www.ssllabs.com/ssltest/
- [ ] Set up automated dependency scanning (Dependabot)
- [ ] Monitor logs for suspicious activity
- [ ] Set up alerting for security events

---

## Supabase Row Level Security (RLS)

Ensure the following RLS policies are enabled in Supabase:

```sql
-- Enable RLS on telemetry_data table
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (using anon key)
CREATE POLICY "Allow anonymous read access"
ON telemetry_data
FOR SELECT
TO anon
USING (true);

-- Restrict INSERT/UPDATE/DELETE to service role only
CREATE POLICY "Restrict write access to service role"
ON telemetry_data
FOR ALL
TO authenticated
USING (auth.role() = 'service_role');
```

---

## Ongoing Security Maintenance

### Weekly Tasks
- [ ] Run `npm audit` and review vulnerabilities
- [ ] Check for security updates in dependencies
- [ ] Review application logs for suspicious activity

### Monthly Tasks
- [ ] Review and update dependencies
- [ ] Security audit of new code
- [ ] Review access logs and rate limiting
- [ ] Test security headers and configurations

### Quarterly Tasks
- [ ] Rotate API keys and secrets
- [ ] Full security audit with penetration testing tools
- [ ] Review and update security policies
- [ ] Security training for development team

---

## Vulnerability Reporting

If you discover a security vulnerability, please report it to:
- **DO NOT** create a public GitHub issue
- Email security details to: [security contact email]
- Include: detailed description, steps to reproduce, potential impact

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [Vite Security](https://vitejs.dev/guide/build.html#advanced-base-options)

---

## Notes

- This application uses Supabase for data storage (not direct Django API)
- Authentication is not required (public read-only data)
- All user inputs are validated on the client side
- Server-side validation should also be implemented for defense in depth
- Regular security audits and updates are essential

**Last Updated**: 2026-01-19
**Version**: 1.0
