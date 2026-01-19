# 🚨 CRITICAL SECURITY WARNING 🚨

## IMMEDIATE ACTIONS REQUIRED

Your repository has **exposed secrets** that were committed to version control. These must be addressed immediately.

---

## 1. Rotate All Exposed Credentials (DO THIS NOW)

### Exposed Secrets:
- ✗ Supabase URL (public in commit history)
- ✗ Supabase Anon Key (public in commit history)
- ✗ Supabase Service Key (public in commit history) **← CRITICAL**
- ✗ Django Secret Key (public in commit history)

### Actions:

#### Supabase Keys (URGENT):
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to: Settings → API
3. Click "Reset" on both:
   - **Anon key** (public)
   - **Service role key** (private) **← DO THIS FIRST**
4. Copy the new keys
5. Update your local `.env` files with new keys
6. **DO NOT commit these files**

#### Django Secret Key:
```bash
# Generate a new secure secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Add to backend/.env (DO NOT commit)
DJANGO_SECRET_KEY=<new-key-here>
```

---

## 2. Remove Secrets from Git History

The `.env` files are in your git history and need to be removed:

```bash
# DANGER: This rewrites git history
# Coordinate with your team before running!

# Remove .env files from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/.env backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (everyone needs to re-clone)
git push origin --force --all
git push origin --force --tags
```

**Alternative (Recommended)**: Use [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/):
```bash
# Install BFG
brew install bfg  # macOS

# Clone a fresh copy
git clone --mirror https://github.com/your-username/telemetrics.git

# Remove .env files
bfg --delete-files '.env' telemetrics.git

# Clean up
cd telemetrics.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push changes
git push
```

---

## 3. Update Production Environment

If you have deployed this application:

1. **Immediately** update all environment variables in your hosting platform:
   - Render/Heroku/Vercel: Update env vars in dashboard
   - Use the NEW rotated keys
   - Set `DJANGO_DEBUG=False`

2. **Restart** your application

3. **Monitor** logs for unauthorized access

---

## 4. Security Checklist

- [ ] Rotated Supabase service role key
- [ ] Rotated Supabase anon key
- [ ] Generated new Django secret key
- [ ] Updated production environment variables
- [ ] Removed `.env` files from git history
- [ ] Verified `.gitignore` includes `.env` files
- [ ] Updated local `.env` files with new keys
- [ ] Restarted production application
- [ ] Checked Supabase logs for unauthorized access

---

## 5. Prevention

Moving forward:

1. **NEVER** commit `.env` files
   - Already added to `.gitignore`
   - Use `.env.example` for templates

2. **Use environment variables** in production
   - Not `.env` files
   - Configure in hosting platform

3. **Enable secret scanning**
   - GitHub: Settings → Security → Secret scanning
   - Use tools like [git-secrets](https://github.com/awslabs/git-secrets)

4. **Regular audits**
   - Review git history for secrets
   - Rotate keys quarterly
   - Monitor access logs

---

## 6. Verify No Other Secrets

Check for other potentially exposed secrets:

```bash
# Search for common secret patterns
git grep -i "password"
git grep -i "secret"
git grep -i "api_key"
git grep -i "token"
git grep "-----BEGIN"

# Check commit history
git log -p | grep -i "password"
```

---

## 7. Monitor for Compromise

Check your Supabase dashboard:
- Settings → Logs → Check for unusual activity
- Check for unexpected data modifications
- Review API usage for anomalies

---

## Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

## Need Help?

If you're unsure about any of these steps:
1. Stop deploying immediately
2. Rotate credentials first (always safe)
3. Seek help from security team
4. Review Supabase logs for unauthorized access

**DO NOT** ignore this warning. Exposed service role keys can lead to:
- Complete database access
- Data breaches
- Data deletion
- Unauthorized API usage
- Security incidents

---

**Status**: ⚠️ URGENT ACTION REQUIRED
**Priority**: P0 - Critical
**Last Updated**: 2026-01-19
